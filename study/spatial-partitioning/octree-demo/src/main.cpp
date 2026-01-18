#include <Windows.h>
#include <d3d11.h>
#include <d3dcompiler.h>
#include <DirectXMath.h>
#include <vector>
#include <string>
#include <chrono>
#include <sstream>
#include <iomanip>
#include <fstream>
#include "Octree.h"
#include "Camera.h"

#pragma comment(lib, "d3d11.lib")
#pragma comment(lib, "d3dcompiler.lib")

using namespace DirectX;
using namespace std::chrono;

// Constants
const int WINDOW_WIDTH = 1280;
const int WINDOW_HEIGHT = 720;
const int OBJECT_COUNT = 50000;  // 10000 -> 50000 (차이 명확하게)
const float WORLD_SIZE = 150.0f;  // 100 -> 150 (더 넓은 공간)

// DirectX globals
ID3D11Device* g_device = nullptr;
ID3D11DeviceContext* g_context = nullptr;
IDXGISwapChain* g_swapChain = nullptr;
ID3D11RenderTargetView* g_renderTargetView = nullptr;
ID3D11DepthStencilView* g_depthStencilView = nullptr;
ID3D11VertexShader* g_vertexShader = nullptr;
ID3D11PixelShader* g_pixelShader = nullptr;
ID3D11InputLayout* g_inputLayout = nullptr;
ID3D11Buffer* g_vertexBuffer = nullptr;
ID3D11Buffer* g_instanceBuffer = nullptr;
ID3D11Buffer* g_constantBuffer = nullptr;
ID3D11RasterizerState* g_rasterizerState = nullptr;
ID3D11DepthStencilState* g_depthStencilState = nullptr;

// Game objects
std::vector<GameObject> g_objects;
Octree* g_octree = nullptr;
Camera g_camera;

// Stats
bool g_useOctree = true;
int g_objectsRendered = 0;
int g_nodeChecks = 0;
float g_fps = 0.0f;
float g_avgFps = 0.0f;  // 평균 FPS (부드럽게)
float g_queryTimeMs = 0.0f;
float g_avgQueryTimeMs = 0.0f;  // 평균 쿼리 시간

struct Vertex {
    XMFLOAT3 position;
};

struct InstanceData {
    XMFLOAT4X4 world;
    XMFLOAT4 color;
};

struct ConstantBuffer {
    XMFLOAT4X4 viewProj;
};

// Forward declarations
LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam);
bool InitD3D(HWND hwnd);
void CleanupD3D();
bool CreateShaders();
void CreateCubeGeometry();
void CreateObjects();
void Update(float deltaTime);
void Render();
void RenderUI();

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE, LPSTR, int) {
    // 기존 로그 파일 삭제 (새 세션 시작)
    DeleteFileA("octree_log.txt");
    DeleteFileA("bruteforce_log.txt");

    // Register window class
    WNDCLASSEXW wc = { sizeof(WNDCLASSEXW), CS_CLASSDC, WndProc, 0, 0,
                       hInstance, NULL, NULL, NULL, NULL,
                       L"OctreeDemo", NULL };
    RegisterClassExW(&wc);

    // Create window
    HWND hwnd = CreateWindowW(wc.lpszClassName, L"Octree Performance Demo - Press SPACE to toggle Octree",
                              WS_OVERLAPPEDWINDOW, 100, 100,
                              WINDOW_WIDTH, WINDOW_HEIGHT,
                              NULL, NULL, wc.hInstance, NULL);

    if (!InitD3D(hwnd)) {
        return 1;
    }

    CreateShaders();
    CreateCubeGeometry();
    CreateObjects();

    ShowWindow(hwnd, SW_SHOWDEFAULT);
    UpdateWindow(hwnd);

    // Main loop
    MSG msg = { 0 };
    auto lastTime = high_resolution_clock::now();

    while (msg.message != WM_QUIT) {
        if (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        } else {
            auto currentTime = high_resolution_clock::now();
            float deltaTime = duration<float>(currentTime - lastTime).count();
            lastTime = currentTime;

            g_fps = 1.0f / deltaTime;

            Update(deltaTime);
            Render();
        }
    }

    CleanupD3D();
    delete g_octree;
    UnregisterClassW(wc.lpszClassName, wc.hInstance);
    return 0;
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    case WM_KEYDOWN:
        if (wParam == VK_SPACE) {
            g_useOctree = !g_useOctree;
        } else if (wParam == VK_ESCAPE) {
            PostQuitMessage(0);
        }
        return 0;
    }
    return DefWindowProc(hwnd, msg, wParam, lParam);
}

bool InitD3D(HWND hwnd) {
    DXGI_SWAP_CHAIN_DESC scd = {};
    scd.BufferCount = 1;
    scd.BufferDesc.Width = WINDOW_WIDTH;
    scd.BufferDesc.Height = WINDOW_HEIGHT;
    scd.BufferDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    scd.BufferDesc.RefreshRate.Numerator = 0;  // VSync OFF
    scd.BufferDesc.RefreshRate.Denominator = 1;
    scd.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
    scd.OutputWindow = hwnd;
    scd.SampleDesc.Count = 1;
    scd.SampleDesc.Quality = 0;
    scd.Windowed = TRUE;
    scd.SwapEffect = DXGI_SWAP_EFFECT_DISCARD;

    D3D_FEATURE_LEVEL featureLevel;
    HRESULT hr = D3D11CreateDeviceAndSwapChain(
        NULL, D3D_DRIVER_TYPE_HARDWARE, NULL, 0, NULL, 0,
        D3D11_SDK_VERSION, &scd, &g_swapChain, &g_device, &featureLevel, &g_context);

    if (FAILED(hr)) return false;

    // Create render target
    ID3D11Texture2D* backBuffer;
    g_swapChain->GetBuffer(0, __uuidof(ID3D11Texture2D), (void**)&backBuffer);
    g_device->CreateRenderTargetView(backBuffer, NULL, &g_renderTargetView);
    backBuffer->Release();

    // Create depth stencil
    D3D11_TEXTURE2D_DESC depthDesc = {};
    depthDesc.Width = WINDOW_WIDTH;
    depthDesc.Height = WINDOW_HEIGHT;
    depthDesc.MipLevels = 1;
    depthDesc.ArraySize = 1;
    depthDesc.Format = DXGI_FORMAT_D24_UNORM_S8_UINT;
    depthDesc.SampleDesc.Count = 1;
    depthDesc.Usage = D3D11_USAGE_DEFAULT;
    depthDesc.BindFlags = D3D11_BIND_DEPTH_STENCIL;

    ID3D11Texture2D* depthStencil;
    g_device->CreateTexture2D(&depthDesc, NULL, &depthStencil);
    g_device->CreateDepthStencilView(depthStencil, NULL, &g_depthStencilView);
    depthStencil->Release();

    g_context->OMSetRenderTargets(1, &g_renderTargetView, g_depthStencilView);

    // Viewport
    D3D11_VIEWPORT vp = {};
    vp.Width = (float)WINDOW_WIDTH;
    vp.Height = (float)WINDOW_HEIGHT;
    vp.MinDepth = 0.0f;
    vp.MaxDepth = 1.0f;
    g_context->RSSetViewports(1, &vp);

    // Rasterizer state
    D3D11_RASTERIZER_DESC rastDesc = {};
    rastDesc.FillMode = D3D11_FILL_SOLID;
    rastDesc.CullMode = D3D11_CULL_BACK;
    rastDesc.FrontCounterClockwise = FALSE;
    rastDesc.DepthClipEnable = TRUE;
    g_device->CreateRasterizerState(&rastDesc, &g_rasterizerState);
    g_context->RSSetState(g_rasterizerState);

    // Depth stencil state
    D3D11_DEPTH_STENCIL_DESC dsDesc = {};
    dsDesc.DepthEnable = TRUE;
    dsDesc.DepthWriteMask = D3D11_DEPTH_WRITE_MASK_ALL;
    dsDesc.DepthFunc = D3D11_COMPARISON_LESS;
    g_device->CreateDepthStencilState(&dsDesc, &g_depthStencilState);
    g_context->OMSetDepthStencilState(g_depthStencilState, 1);

    g_camera.aspectRatio = (float)WINDOW_WIDTH / WINDOW_HEIGHT;

    return true;
}

void CleanupD3D() {
    if (g_context) g_context->ClearState();
    if (g_depthStencilState) g_depthStencilState->Release();
    if (g_rasterizerState) g_rasterizerState->Release();
    if (g_constantBuffer) g_constantBuffer->Release();
    if (g_instanceBuffer) g_instanceBuffer->Release();
    if (g_vertexBuffer) g_vertexBuffer->Release();
    if (g_inputLayout) g_inputLayout->Release();
    if (g_pixelShader) g_pixelShader->Release();
    if (g_vertexShader) g_vertexShader->Release();
    if (g_depthStencilView) g_depthStencilView->Release();
    if (g_renderTargetView) g_renderTargetView->Release();
    if (g_swapChain) g_swapChain->Release();
    if (g_context) g_context->Release();
    if (g_device) g_device->Release();
}

bool CreateShaders() {
    // Vertex Shader
    const char* vsCode = R"(
        cbuffer ConstantBuffer : register(b0) {
            matrix viewProj;
        };

        struct VS_INPUT {
            float3 pos : POSITION;
            float4x4 world : WORLD;
            float4 color : COLOR;
            uint instanceID : SV_InstanceID;
        };

        struct PS_INPUT {
            float4 pos : SV_POSITION;
            float4 color : COLOR;
        };

        PS_INPUT main(VS_INPUT input) {
            PS_INPUT output;
            float4 worldPos = mul(float4(input.pos, 1.0f), input.world);
            output.pos = mul(worldPos, viewProj);
            output.color = input.color;
            return output;
        }
    )";

    // Pixel Shader
    const char* psCode = R"(
        struct PS_INPUT {
            float4 pos : SV_POSITION;
            float4 color : COLOR;
        };

        float4 main(PS_INPUT input) : SV_TARGET {
            return input.color;
        }
    )";

    ID3DBlob* vsBlob = nullptr;
    ID3DBlob* psBlob = nullptr;
    ID3DBlob* errorBlob = nullptr;

    HRESULT hr = D3DCompile(vsCode, strlen(vsCode), NULL, NULL, NULL,
                            "main", "vs_5_0", 0, 0, &vsBlob, &errorBlob);
    if (FAILED(hr)) {
        if (errorBlob) {
            OutputDebugStringA((char*)errorBlob->GetBufferPointer());
            errorBlob->Release();
        }
        return false;
    }

    hr = D3DCompile(psCode, strlen(psCode), NULL, NULL, NULL,
                    "main", "ps_5_0", 0, 0, &psBlob, &errorBlob);
    if (FAILED(hr)) {
        if (errorBlob) {
            OutputDebugStringA((char*)errorBlob->GetBufferPointer());
            errorBlob->Release();
        }
        return false;
    }

    g_device->CreateVertexShader(vsBlob->GetBufferPointer(), vsBlob->GetBufferSize(), NULL, &g_vertexShader);
    g_device->CreatePixelShader(psBlob->GetBufferPointer(), psBlob->GetBufferSize(), NULL, &g_pixelShader);

    // Input layout
    D3D11_INPUT_ELEMENT_DESC layout[] = {
        { "POSITION", 0, DXGI_FORMAT_R32G32B32_FLOAT, 0, 0, D3D11_INPUT_PER_VERTEX_DATA, 0 },
        { "WORLD", 0, DXGI_FORMAT_R32G32B32A32_FLOAT, 1, 0, D3D11_INPUT_PER_INSTANCE_DATA, 1 },
        { "WORLD", 1, DXGI_FORMAT_R32G32B32A32_FLOAT, 1, 16, D3D11_INPUT_PER_INSTANCE_DATA, 1 },
        { "WORLD", 2, DXGI_FORMAT_R32G32B32A32_FLOAT, 1, 32, D3D11_INPUT_PER_INSTANCE_DATA, 1 },
        { "WORLD", 3, DXGI_FORMAT_R32G32B32A32_FLOAT, 1, 48, D3D11_INPUT_PER_INSTANCE_DATA, 1 },
        { "COLOR", 0, DXGI_FORMAT_R32G32B32A32_FLOAT, 1, 64, D3D11_INPUT_PER_INSTANCE_DATA, 1 }
    };

    g_device->CreateInputLayout(layout, ARRAYSIZE(layout),
                                vsBlob->GetBufferPointer(), vsBlob->GetBufferSize(),
                                &g_inputLayout);

    vsBlob->Release();
    psBlob->Release();

    // Constant buffer
    D3D11_BUFFER_DESC cbDesc = {};
    cbDesc.ByteWidth = sizeof(ConstantBuffer);
    cbDesc.Usage = D3D11_USAGE_DYNAMIC;
    cbDesc.BindFlags = D3D11_BIND_CONSTANT_BUFFER;
    cbDesc.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;
    g_device->CreateBuffer(&cbDesc, NULL, &g_constantBuffer);

    return true;
}

void CreateCubeGeometry() {
    Vertex vertices[] = {
        // Front
        {XMFLOAT3(-0.5f, -0.5f, -0.5f)}, {XMFLOAT3(-0.5f,  0.5f, -0.5f)}, {XMFLOAT3( 0.5f,  0.5f, -0.5f)},
        {XMFLOAT3(-0.5f, -0.5f, -0.5f)}, {XMFLOAT3( 0.5f,  0.5f, -0.5f)}, {XMFLOAT3( 0.5f, -0.5f, -0.5f)},
        // Back
        {XMFLOAT3( 0.5f, -0.5f,  0.5f)}, {XMFLOAT3( 0.5f,  0.5f,  0.5f)}, {XMFLOAT3(-0.5f,  0.5f,  0.5f)},
        {XMFLOAT3( 0.5f, -0.5f,  0.5f)}, {XMFLOAT3(-0.5f,  0.5f,  0.5f)}, {XMFLOAT3(-0.5f, -0.5f,  0.5f)},
        // Top
        {XMFLOAT3(-0.5f,  0.5f, -0.5f)}, {XMFLOAT3(-0.5f,  0.5f,  0.5f)}, {XMFLOAT3( 0.5f,  0.5f,  0.5f)},
        {XMFLOAT3(-0.5f,  0.5f, -0.5f)}, {XMFLOAT3( 0.5f,  0.5f,  0.5f)}, {XMFLOAT3( 0.5f,  0.5f, -0.5f)},
        // Bottom
        {XMFLOAT3(-0.5f, -0.5f,  0.5f)}, {XMFLOAT3(-0.5f, -0.5f, -0.5f)}, {XMFLOAT3( 0.5f, -0.5f, -0.5f)},
        {XMFLOAT3(-0.5f, -0.5f,  0.5f)}, {XMFLOAT3( 0.5f, -0.5f, -0.5f)}, {XMFLOAT3( 0.5f, -0.5f,  0.5f)},
        // Left
        {XMFLOAT3(-0.5f, -0.5f,  0.5f)}, {XMFLOAT3(-0.5f,  0.5f,  0.5f)}, {XMFLOAT3(-0.5f,  0.5f, -0.5f)},
        {XMFLOAT3(-0.5f, -0.5f,  0.5f)}, {XMFLOAT3(-0.5f,  0.5f, -0.5f)}, {XMFLOAT3(-0.5f, -0.5f, -0.5f)},
        // Right
        {XMFLOAT3( 0.5f, -0.5f, -0.5f)}, {XMFLOAT3( 0.5f,  0.5f, -0.5f)}, {XMFLOAT3( 0.5f,  0.5f,  0.5f)},
        {XMFLOAT3( 0.5f, -0.5f, -0.5f)}, {XMFLOAT3( 0.5f,  0.5f,  0.5f)}, {XMFLOAT3( 0.5f, -0.5f,  0.5f)}
    };

    D3D11_BUFFER_DESC vbDesc = {};
    vbDesc.ByteWidth = sizeof(vertices);
    vbDesc.Usage = D3D11_USAGE_DEFAULT;
    vbDesc.BindFlags = D3D11_BIND_VERTEX_BUFFER;

    D3D11_SUBRESOURCE_DATA vbData = {};
    vbData.pSysMem = vertices;

    g_device->CreateBuffer(&vbDesc, &vbData, &g_vertexBuffer);

    // Create instance buffer
    D3D11_BUFFER_DESC ibDesc = {};
    ibDesc.ByteWidth = sizeof(InstanceData) * OBJECT_COUNT;
    ibDesc.Usage = D3D11_USAGE_DYNAMIC;
    ibDesc.BindFlags = D3D11_BIND_VERTEX_BUFFER;
    ibDesc.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;
    g_device->CreateBuffer(&ibDesc, NULL, &g_instanceBuffer);
}

void CreateObjects() {
    g_objects.reserve(OBJECT_COUNT);

    for (int i = 0; i < OBJECT_COUNT; i++) {
        float x = ((rand() % 10000) / 10000.0f - 0.5f) * WORLD_SIZE;
        float y = ((rand() % 10000) / 10000.0f - 0.5f) * WORLD_SIZE;
        float z = ((rand() % 10000) / 10000.0f - 0.5f) * WORLD_SIZE;

        float r = (rand() % 100) / 100.0f;
        float g = (rand() % 100) / 100.0f;
        float b = (rand() % 100) / 100.0f;

        g_objects.emplace_back(XMFLOAT3(x, y, z), XMFLOAT3(r, g, b));
    }

    // Build Octree
    BoundingBox worldBounds;
    worldBounds.center = XMFLOAT3(0.0f, 0.0f, 0.0f);
    worldBounds.halfSize = XMFLOAT3(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE / 2);

    g_octree = new Octree(worldBounds, 6);
    g_octree->Build(g_objects);
}

void Update(float deltaTime) {
    static float time = 0.0f;
    time += deltaTime;

    // Rotate camera
    g_camera.Rotate(deltaTime * 0.2f, 0.0f);

    // 통계 누적 (1초 동안)
    static float statsTimer = 0.0f;
    static float fpsSum = 0.0f;
    static float queryTimeSum = 0.0f;
    static int sampleCount = 0;
    static float elapsedTime = 0.0f;

    fpsSum += g_fps;
    queryTimeSum += g_queryTimeMs;
    sampleCount++;
    statsTimer += deltaTime;

    // 1초마다 평균 업데이트
    if (statsTimer >= 1.0f) {
        g_avgFps = fpsSum / sampleCount;
        g_avgQueryTimeMs = queryTimeSum / sampleCount;

        // 로그 파일에 기록
        const char* logFile = g_useOctree ? "octree_log.txt" : "bruteforce_log.txt";
        std::ofstream log(logFile, std::ios::app);

        if (log.is_open()) {
            // 첫 번째 줄이면 헤더 추가
            static bool octreeHeaderWritten = false;
            static bool bruteforceHeaderWritten = false;
            bool* headerFlag = g_useOctree ? &octreeHeaderWritten : &bruteforceHeaderWritten;

            if (!(*headerFlag)) {
                log << "Time(s),FPS,Visible,Total,Checks,QueryTime(ms)\n";
                *headerFlag = true;
            }

            log << std::fixed << std::setprecision(2);
            log << elapsedTime << ","
                << g_avgFps << ","
                << g_objectsRendered << ","
                << OBJECT_COUNT << ","
                << g_nodeChecks << ","
                << g_avgQueryTimeMs << "\n";
            log.close();
        }

        elapsedTime += statsTimer;

        // 리셋
        statsTimer = 0.0f;
        fpsSum = 0.0f;
        queryTimeSum = 0.0f;
        sampleCount = 0;
    }
}

void Render() {
    // 배경색으로 모드 표시 (미묘하게)
    float clearColor[4];
    if (g_useOctree) {
        clearColor[0] = 0.05f; clearColor[1] = 0.15f; clearColor[2] = 0.1f; clearColor[3] = 1.0f;  // 약간 초록
    } else {
        clearColor[0] = 0.15f; clearColor[1] = 0.05f; clearColor[2] = 0.05f; clearColor[3] = 1.0f;  // 약간 빨강
    }
    g_context->ClearRenderTargetView(g_renderTargetView, clearColor);
    g_context->ClearDepthStencilView(g_depthStencilView, D3D11_CLEAR_DEPTH, 1.0f, 0);

    // Setup frustum
    XMMATRIX view = g_camera.GetViewMatrix();
    XMMATRIX proj = g_camera.GetProjectionMatrix();
    XMMATRIX viewProj = view * proj;

    Frustum frustum;
    frustum.Update(viewProj);

    // Query visible objects
    std::vector<GameObject*> visibleObjects;
    auto queryStart = high_resolution_clock::now();

    if (g_useOctree) {
        g_octree->Query(frustum, visibleObjects, g_nodeChecks);
    } else {
        g_nodeChecks = 0;
        for (auto& obj : g_objects) {
            if (frustum.IntersectsBox(obj.bounds)) {
                visibleObjects.push_back(&obj);
            }
            g_nodeChecks++;
        }
    }

    auto queryEnd = high_resolution_clock::now();
    g_queryTimeMs = duration<float, std::milli>(queryEnd - queryStart).count();
    g_objectsRendered = (int)visibleObjects.size();

    // Update instance buffer
    if (g_objectsRendered > 0) {
        D3D11_MAPPED_SUBRESOURCE mapped;
        g_context->Map(g_instanceBuffer, 0, D3D11_MAP_WRITE_DISCARD, 0, &mapped);

        InstanceData* instances = (InstanceData*)mapped.pData;
        for (size_t i = 0; i < visibleObjects.size(); i++) {
            XMMATRIX world = XMMatrixTranslation(
                visibleObjects[i]->position.x,
                visibleObjects[i]->position.y,
                visibleObjects[i]->position.z
            );
            XMStoreFloat4x4(&instances[i].world, XMMatrixTranspose(world));
            instances[i].color = XMFLOAT4(
                visibleObjects[i]->color.x,
                visibleObjects[i]->color.y,
                visibleObjects[i]->color.z,
                1.0f
            );
        }

        g_context->Unmap(g_instanceBuffer, 0);

        // Update constant buffer
        D3D11_MAPPED_SUBRESOURCE cbMapped;
        g_context->Map(g_constantBuffer, 0, D3D11_MAP_WRITE_DISCARD, 0, &cbMapped);
        ConstantBuffer* cb = (ConstantBuffer*)cbMapped.pData;
        XMStoreFloat4x4(&cb->viewProj, XMMatrixTranspose(viewProj));
        g_context->Unmap(g_constantBuffer, 0);

        // Draw
        g_context->VSSetShader(g_vertexShader, NULL, 0);
        g_context->PSSetShader(g_pixelShader, NULL, 0);
        g_context->VSSetConstantBuffers(0, 1, &g_constantBuffer);
        g_context->IASetInputLayout(g_inputLayout);

        UINT strides[2] = { sizeof(Vertex), sizeof(InstanceData) };
        UINT offsets[2] = { 0, 0 };
        ID3D11Buffer* buffers[2] = { g_vertexBuffer, g_instanceBuffer };

        g_context->IASetVertexBuffers(0, 2, buffers, strides, offsets);
        g_context->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);
        g_context->DrawInstanced(36, g_objectsRendered, 0, 0);
    }

    RenderUI();
    g_swapChain->Present(0, 0);
}

void RenderUI() {
    // UI 업데이트 빈도 제한 (0.5초마다)
    static float uiUpdateTimer = 0.0f;
    static auto lastTime = high_resolution_clock::now();

    auto currentTime = high_resolution_clock::now();
    float deltaTime = duration<float>(currentTime - lastTime).count();
    lastTime = currentTime;
    uiUpdateTimer += deltaTime;

    if (uiUpdateTimer < 0.5f) {
        return;  // 0.5초 안 되면 업데이트 안 함
    }
    uiUpdateTimer = 0.0f;

    std::wstringstream ss;
    ss << std::fixed << std::setprecision(0);  // 소수점 없이

    // 모드 표시 (크게)
    if (g_useOctree) {
        ss << L"[OCTREE ON] ";
    } else {
        ss << L"[BRUTE FORCE] ";
    }

    // FPS (평균, 정수로)
    ss << L"FPS: " << (int)g_avgFps << L" | ";

    // Objects
    ss << L"Visible: " << g_objectsRendered << L" / " << OBJECT_COUNT << L" | ";

    // Checks (핵심!)
    ss << L"Checks: " << g_nodeChecks;

    // 성능 비교 (간단하게)
    if (g_nodeChecks < OBJECT_COUNT / 10) {
        ss << L" (FAST!) | ";
    } else {
        ss << L" (SLOW) | ";
    }

    // Query Time
    ss << std::fixed << std::setprecision(2);  // 소수점 2자리
    ss << L"Query: " << g_avgQueryTimeMs << L"ms | ";

    // 로그 기록 중 표시
    if (g_useOctree) {
        ss << L"[LOG: octree_log.txt] | ";
    } else {
        ss << L"[LOG: bruteforce_log.txt] | ";
    }

    // 조작 안내
    ss << L"SPACE to toggle";

    SetWindowTextW(GetActiveWindow(), ss.str().c_str());
}
