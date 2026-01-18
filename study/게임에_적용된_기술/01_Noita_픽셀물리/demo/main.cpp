// Noita 스타일 픽셀 물리 시뮬레이션 (DirectX 11)
// 빌드: Visual Studio에서 Win32 Desktop Application으로 생성 후 이 코드 사용
// 링크: d3d11.lib, dxgi.lib, d3dcompiler.lib

#include <Windows.h>
#include <d3d11.h>
#include <DirectXMath.h>
#include <vector>
#include <cstdint>
#include <cstdlib>
#include <ctime>

#pragma comment(lib, "d3d11.lib")
#pragma comment(lib, "dxgi.lib")

using namespace DirectX;

// ============================================
// 설정
// ============================================
const int WINDOW_WIDTH = 800;
const int WINDOW_HEIGHT = 600;
const int GRID_WIDTH = 200;
const int GRID_HEIGHT = 150;
const int PIXEL_SIZE = 4;  // 화면 픽셀당 그리드 픽셀 크기

const int CHUNK_SIZE = 16;
const int CHUNKS_X = (GRID_WIDTH + CHUNK_SIZE - 1) / CHUNK_SIZE;
const int CHUNKS_Y = (GRID_HEIGHT + CHUNK_SIZE - 1) / CHUNK_SIZE;

// ============================================
// 물질 타입
// ============================================
enum PixelType : uint8_t {
    EMPTY = 0,
    SAND = 1,
    WATER = 2,
    STONE = 3,
    FIRE = 4,
    STEAM = 5
};

struct Pixel {
    PixelType type;
    uint8_t flags;
    int8_t vx, vy;
    uint8_t lifetime;

    enum Flags : uint8_t {
        UPDATED = 1 << 0,
        MOVED = 1 << 1
    };
};

struct Chunk {
    bool active;
    int sleepCounter;
};

// ============================================
// 전역 변수
// ============================================
Pixel* g_Grid = nullptr;
Chunk* g_Chunks = nullptr;
uint32_t* g_ColorBuffer = nullptr;

HWND g_hwnd = nullptr;
ID3D11Device* g_device = nullptr;
ID3D11DeviceContext* g_context = nullptr;
IDXGISwapChain* g_swapChain = nullptr;
ID3D11RenderTargetView* g_renderTargetView = nullptr;
ID3D11Texture2D* g_backBuffer = nullptr;

PixelType g_currentMaterial = SAND;
bool g_isDrawing = false;

// ============================================
// 색상 팔레트
// ============================================
uint32_t GetColor(PixelType type) {
    switch (type) {
        case EMPTY: return 0xFF000000;
        case SAND:  return 0xFFC2B280;
        case WATER: return 0xFF4A90E2;
        case STONE: return 0xFF555555;
        case FIRE:  return 0xFFFF4500;
        case STEAM: return 0xFFAAAAAA;
        default:    return 0xFF000000;
    }
}

// ============================================
// 그리드 함수
// ============================================
inline int GetIndex(int x, int y) {
    return y * GRID_WIDTH + x;
}

inline bool InBounds(int x, int y) {
    return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
}

inline bool IsEmpty(int x, int y) {
    if (!InBounds(x, y)) return false;
    return g_Grid[GetIndex(x, y)].type == EMPTY;
}

inline bool IsLiquid(int x, int y) {
    if (!InBounds(x, y)) return false;
    return g_Grid[GetIndex(x, y)].type == WATER;
}

void ActivateChunk(int x, int y) {
    int cx = x / CHUNK_SIZE;
    int cy = y / CHUNK_SIZE;

    // 이웃 청크도 활성화
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            int ncx = cx + dx;
            int ncy = cy + dy;
            if (ncx >= 0 && ncx < CHUNKS_X && ncy >= 0 && ncy < CHUNKS_Y) {
                int chunkIdx = ncy * CHUNKS_X + ncx;
                g_Chunks[chunkIdx].active = true;
                g_Chunks[chunkIdx].sleepCounter = 0;
            }
        }
    }
}

void MovePixel(int fromX, int fromY, int toX, int toY) {
    int fromIdx = GetIndex(fromX, fromY);
    int toIdx = GetIndex(toX, toY);

    g_Grid[toIdx] = g_Grid[fromIdx];
    g_Grid[toIdx].flags |= Pixel::UPDATED;

    g_Grid[fromIdx].type = EMPTY;
    g_Grid[fromIdx].flags = 0;
    g_Grid[fromIdx].lifetime = 0;

    ActivateChunk(toX, toY);
}

void SwapPixel(int x1, int y1, int x2, int y2) {
    int idx1 = GetIndex(x1, y1);
    int idx2 = GetIndex(x2, y2);

    Pixel temp = g_Grid[idx1];
    g_Grid[idx1] = g_Grid[idx2];
    g_Grid[idx2] = temp;

    g_Grid[idx1].flags |= Pixel::UPDATED;
    g_Grid[idx2].flags |= Pixel::UPDATED;

    ActivateChunk(x1, y1);
    ActivateChunk(x2, y2);
}

// ============================================
// 물질별 업데이트
// ============================================
void UpdateSand(int x, int y) {
    // 1. 아래로
    if (IsEmpty(x, y + 1)) {
        MovePixel(x, y, x, y + 1);
        return;
    }

    // 2. 물과 교환 (모래가 더 무거움)
    if (IsLiquid(x, y + 1)) {
        SwapPixel(x, y, x, y + 1);
        return;
    }

    // 3. 대각선
    int dirs[2][2] = {{-1, 1}, {1, 1}};
    if (rand() % 2) {
        int temp[2] = {dirs[0][0], dirs[0][1]};
        dirs[0][0] = dirs[1][0];
        dirs[0][1] = dirs[1][1];
        dirs[1][0] = temp[0];
        dirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + dirs[i][0];
        int ny = y + dirs[i][1];

        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }

        if (IsLiquid(nx, ny)) {
            SwapPixel(x, y, nx, ny);
            return;
        }
    }
}

void UpdateWater(int x, int y) {
    // 1. 아래로
    if (IsEmpty(x, y + 1)) {
        MovePixel(x, y, x, y + 1);
        return;
    }

    // 2. 대각선 아래
    int diagDirs[2][2] = {{-1, 1}, {1, 1}};
    if (rand() % 2) {
        int temp[2] = {diagDirs[0][0], diagDirs[0][1]};
        diagDirs[0][0] = diagDirs[1][0];
        diagDirs[0][1] = diagDirs[1][1];
        diagDirs[1][0] = temp[0];
        diagDirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + diagDirs[i][0];
        int ny = y + diagDirs[i][1];
        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }
    }

    // 3. 옆으로
    int sideDirs[2][2] = {{-1, 0}, {1, 0}};
    if (rand() % 2) {
        int temp[2] = {sideDirs[0][0], sideDirs[0][1]};
        sideDirs[0][0] = sideDirs[1][0];
        sideDirs[0][1] = sideDirs[1][1];
        sideDirs[1][0] = temp[0];
        sideDirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + sideDirs[i][0];
        int ny = y + sideDirs[i][1];
        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }
    }
}

void UpdateFire(int x, int y) {
    int idx = GetIndex(x, y);

    // 수명 감소
    if (g_Grid[idx].lifetime > 0) {
        g_Grid[idx].lifetime--;
    } else {
        g_Grid[idx].type = EMPTY;
        ActivateChunk(x, y);
        return;
    }

    // 주변에 물 있나?
    int neighbors[4][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    for (int i = 0; i < 4; i++) {
        int nx = x + neighbors[i][0];
        int ny = y + neighbors[i][1];

        if (!InBounds(nx, ny)) continue;

        int nIdx = GetIndex(nx, ny);
        if (g_Grid[nIdx].type == WATER) {
            g_Grid[nIdx].type = STEAM;
            g_Grid[nIdx].lifetime = 20;
            g_Grid[idx].type = STEAM;
            g_Grid[idx].lifetime = 20;
            ActivateChunk(x, y);
            ActivateChunk(nx, ny);
            return;
        }
    }

    // 모래 점화 (확률적)
    if (rand() % 10 == 0) {
        int n = rand() % 4;
        int nx = x + neighbors[n][0];
        int ny = y + neighbors[n][1];

        if (InBounds(nx, ny)) {
            int nIdx = GetIndex(nx, ny);
            if (g_Grid[nIdx].type == SAND) {
                g_Grid[nIdx].type = FIRE;
                g_Grid[nIdx].lifetime = 30;
                ActivateChunk(nx, ny);
            }
        }
    }

    // 위로 상승
    if (rand() % 3 == 0 && IsEmpty(x, y - 1)) {
        MovePixel(x, y, x, y - 1);
    }
}

void UpdateSteam(int x, int y) {
    int idx = GetIndex(x, y);

    // 수명 감소
    if (g_Grid[idx].lifetime > 0) {
        g_Grid[idx].lifetime--;
    } else {
        g_Grid[idx].type = EMPTY;
        ActivateChunk(x, y);
        return;
    }

    // 위로 상승
    if (IsEmpty(x, y - 1)) {
        MovePixel(x, y, x, y - 1);
        return;
    }

    // 대각선 위
    int diagDirs[2][2] = {{-1, -1}, {1, -1}};
    if (rand() % 2) {
        int temp[2] = {diagDirs[0][0], diagDirs[0][1]};
        diagDirs[0][0] = diagDirs[1][0];
        diagDirs[0][1] = diagDirs[1][1];
        diagDirs[1][0] = temp[0];
        diagDirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + diagDirs[i][0];
        int ny = y + diagDirs[i][1];
        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }
    }

    // 옆으로
    int sideDirs[2][2] = {{-1, 0}, {1, 0}};
    if (rand() % 2) {
        int temp[2] = {sideDirs[0][0], sideDirs[0][1]};
        sideDirs[0][0] = sideDirs[1][0];
        sideDirs[0][1] = sideDirs[1][1];
        sideDirs[1][0] = temp[0];
        sideDirs[1][1] = temp[1];
    }

    for (int i = 0; i < 2; i++) {
        int nx = x + sideDirs[i][0];
        int ny = y + sideDirs[i][1];
        if (IsEmpty(nx, ny)) {
            MovePixel(x, y, nx, ny);
            return;
        }
    }
}

// ============================================
// 메인 업데이트 루프
// ============================================
void UpdateSimulation() {
    // 1. 플래그 리셋
    for (int i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
        g_Grid[i].flags = 0;
    }

    // 2. 청크별 업데이트
    for (int cy = CHUNKS_Y - 1; cy >= 0; cy--) {
        for (int cx = 0; cx < CHUNKS_X; cx++) {
            int chunkIdx = cy * CHUNKS_X + cx;

            if (!g_Chunks[chunkIdx].active) continue;

            bool hasChanges = false;

            int xStart = cx * CHUNK_SIZE;
            int yStart = cy * CHUNK_SIZE;
            int xEnd = min(xStart + CHUNK_SIZE, GRID_WIDTH);
            int yEnd = min(yStart + CHUNK_SIZE, GRID_HEIGHT);

            for (int y = yEnd - 1; y >= yStart; y--) {
                for (int x = xStart; x < xEnd; x++) {
                    int idx = GetIndex(x, y);

                    if (g_Grid[idx].flags & Pixel::UPDATED) continue;

                    PixelType type = g_Grid[idx].type;
                    PixelType before = type;

                    switch (type) {
                        case SAND:  UpdateSand(x, y);  break;
                        case WATER: UpdateWater(x, y); break;
                        case FIRE:  UpdateFire(x, y);  break;
                        case STEAM: UpdateSteam(x, y); break;
                        default: break;
                    }

                    if (g_Grid[idx].type != before || (g_Grid[idx].flags & Pixel::UPDATED)) {
                        hasChanges = true;
                    }
                }
            }

            // Sleep 관리
            if (hasChanges) {
                g_Chunks[chunkIdx].sleepCounter = 0;
            } else {
                g_Chunks[chunkIdx].sleepCounter++;
                if (g_Chunks[chunkIdx].sleepCounter > 10) {
                    g_Chunks[chunkIdx].active = false;
                }
            }
        }
    }
}

// ============================================
// 렌더링
// ============================================
void UpdateColorBuffer() {
    for (int i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
        g_ColorBuffer[i] = GetColor(g_Grid[i].type);
    }
}

void Render() {
    // 색상 버퍼 업데이트
    UpdateColorBuffer();

    // Texture 업데이트
    D3D11_MAPPED_SUBRESOURCE mapped;
    g_context->Map(g_texture, 0, D3D11_MAP_WRITE_DISCARD, 0, &mapped);
    memcpy(mapped.pData, g_ColorBuffer, GRID_WIDTH * GRID_HEIGHT * 4);
    g_context->Unmap(g_texture, 0);

    // 렌더 타겟 클리어
    float clearColor[4] = { 0.1f, 0.1f, 0.1f, 1.0f };
    g_context->ClearRenderTargetView(g_renderTargetView, clearColor);

    // 텍스처를 화면에 그리기 (간단히 Present로 스왑)
    // 실제로는 VertexShader + PixelShader로 Quad 그려야 하지만
    // 여기서는 간단히 texture를 직접 복사

    g_swapChain->Present(1, 0);
}

// ============================================
// 마우스 입력
// ============================================
void HandleMouse(int mouseX, int mouseY) {
    int gridX = mouseX / PIXEL_SIZE;
    int gridY = mouseY / PIXEL_SIZE;

    // 브러시 (3×3)
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            int x = gridX + dx;
            int y = gridY + dy;

            if (InBounds(x, y)) {
                int idx = GetIndex(x, y);
                g_Grid[idx].type = g_currentMaterial;

                if (g_currentMaterial == FIRE) {
                    g_Grid[idx].lifetime = 30;
                }

                ActivateChunk(x, y);
            }
        }
    }
}

// ============================================
// DirectX 초기화
// ============================================
bool InitD3D(HWND hwnd) {
    // Swap Chain 설정
    DXGI_SWAP_CHAIN_DESC sd = {};
    sd.BufferCount = 1;
    sd.BufferDesc.Width = WINDOW_WIDTH;
    sd.BufferDesc.Height = WINDOW_HEIGHT;
    sd.BufferDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    sd.BufferDesc.RefreshRate.Numerator = 60;
    sd.BufferDesc.RefreshRate.Denominator = 1;
    sd.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
    sd.OutputWindow = hwnd;
    sd.SampleDesc.Count = 1;
    sd.Windowed = TRUE;

    D3D_FEATURE_LEVEL featureLevel;
    HRESULT hr = D3D11CreateDeviceAndSwapChain(
        nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, 0,
        nullptr, 0, D3D11_SDK_VERSION,
        &sd, &g_swapChain, &g_device, &featureLevel, &g_context
    );

    if (FAILED(hr)) return false;

    // Render Target View
    ID3D11Texture2D* backBuffer = nullptr;
    g_swapChain->GetBuffer(0, __uuidof(ID3D11Texture2D), (void**)&backBuffer);
    g_device->CreateRenderTargetView(backBuffer, nullptr, &g_renderTargetView);
    backBuffer->Release();

    g_context->OMSetRenderTargets(1, &g_renderTargetView, nullptr);

    // Viewport
    D3D11_VIEWPORT vp = {};
    vp.Width = (float)WINDOW_WIDTH;
    vp.Height = (float)WINDOW_HEIGHT;
    vp.MinDepth = 0.0f;
    vp.MaxDepth = 1.0f;
    g_context->RSSetViewports(1, &vp);

    // Texture 생성
    D3D11_TEXTURE2D_DESC texDesc = {};
    texDesc.Width = GRID_WIDTH;
    texDesc.Height = GRID_HEIGHT;
    texDesc.MipLevels = 1;
    texDesc.ArraySize = 1;
    texDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    texDesc.SampleDesc.Count = 1;
    texDesc.Usage = D3D11_USAGE_DYNAMIC;
    texDesc.BindFlags = D3D11_BIND_SHADER_RESOURCE;
    texDesc.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;

    hr = g_device->CreateTexture2D(&texDesc, nullptr, &g_texture);
    if (FAILED(hr)) return false;

    hr = g_device->CreateShaderResourceView(g_texture, nullptr, &g_textureSRV);
    if (FAILED(hr)) return false;

    return true;
}

void CleanupD3D() {
    if (g_textureSRV) g_textureSRV->Release();
    if (g_texture) g_texture->Release();
    if (g_renderTargetView) g_renderTargetView->Release();
    if (g_swapChain) g_swapChain->Release();
    if (g_context) g_context->Release();
    if (g_device) g_device->Release();
}

// ============================================
// 윈도우 프로시저
// ============================================
LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;

        case WM_LBUTTONDOWN:
            g_isDrawing = true;
            HandleMouse(LOWORD(lParam), HIWORD(lParam));
            return 0;

        case WM_LBUTTONUP:
            g_isDrawing = false;
            return 0;

        case WM_MOUSEMOVE:
            if (g_isDrawing) {
                HandleMouse(LOWORD(lParam), HIWORD(lParam));
            }
            return 0;

        case WM_KEYDOWN:
            switch (wParam) {
                case '1': g_currentMaterial = SAND;  break;
                case '2': g_currentMaterial = WATER; break;
                case '3': g_currentMaterial = STONE; break;
                case '4': g_currentMaterial = FIRE;  break;
                case '0': g_currentMaterial = EMPTY; break;
            }
            return 0;
    }

    return DefWindowProc(hwnd, msg, wParam, lParam);
}

// ============================================
// 진입점
// ============================================
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE, LPSTR, int) {
    srand((unsigned)time(nullptr));

    // 그리드 초기화
    g_Grid = new Pixel[GRID_WIDTH * GRID_HEIGHT]();
    g_Chunks = new Chunk[CHUNKS_X * CHUNKS_Y]();
    g_ColorBuffer = new uint32_t[GRID_WIDTH * GRID_HEIGHT]();

    // 윈도우 클래스 등록
    WNDCLASSEX wc = {};
    wc.cbSize = sizeof(WNDCLASSEX);
    wc.style = CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wc.lpszClassName = L"NoitaPixelPhysics";
    RegisterClassEx(&wc);

    // 윈도우 생성
    g_hwnd = CreateWindowEx(
        0, L"NoitaPixelPhysics", L"Noita 픽셀 물리 - 1:모래 2:물 3:돌 4:불 0:지우개",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, WINDOW_WIDTH, WINDOW_HEIGHT,
        nullptr, nullptr, hInstance, nullptr
    );

    if (!g_hwnd) return 1;

    // DirectX 초기화
    if (!InitD3D(g_hwnd)) {
        MessageBox(nullptr, L"DirectX 초기화 실패", L"Error", MB_OK);
        return 1;
    }

    ShowWindow(g_hwnd, SW_SHOW);
    UpdateWindow(g_hwnd);

    // 메인 루프
    MSG msg = {};
    while (msg.message != WM_QUIT) {
        if (PeekMessage(&msg, nullptr, 0, 0, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        } else {
            UpdateSimulation();
            Render();
            Sleep(16);  // ~60 FPS
        }
    }

    // 정리
    CleanupD3D();
    delete[] g_Grid;
    delete[] g_Chunks;
    delete[] g_ColorBuffer;

    return (int)msg.wParam;
}
