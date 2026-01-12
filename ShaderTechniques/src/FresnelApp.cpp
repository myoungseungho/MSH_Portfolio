#include "FresnelApp.h"
#include <sstream>

FresnelApp::FresnelApp()
    : m_totalTime(0.0f)
    , m_fresnelPower(3.0f)
    , m_fresnelIntensity(2.0f)
    , m_fresnelColor(0.3f, 0.8f, 1.0f, 1.0f)
    , m_currentStep(1)
{
}

FresnelApp::~FresnelApp()
{
}

bool FresnelApp::LoadContent()
{
    // 카메라 설정
    m_camera.SetPosition(0.0f, 0.0f, -5.0f);
    m_camera.SetLens(XM_PIDIV4, static_cast<float>(m_width) / m_height, 0.1f, 1000.0f);
    m_camera.LookAt(
        XMFLOAT3(0.0f, 0.0f, -5.0f),
        XMFLOAT3(0.0f, 0.0f, 0.0f),
        XMFLOAT3(0.0f, 1.0f, 0.0f)
    );
    m_camera.UpdateViewMatrix();

    // 구체 메시 생성
    if (!m_sphere.CreateSphere(m_device.Get(), 1.5f, 40, 40))
        return false;

    // 쉐이더 생성
    if (!CreateShaders())
        return false;

    // 상수 버퍼 생성
    if (!CreateConstantBuffers())
        return false;

    // 블렌드 스테이트 생성
    if (!CreateBlendState())
        return false;

    return true;
}

void FresnelApp::UnloadContent()
{
    m_sphere.Release();
}

bool FresnelApp::CreateShaders()
{
    // Vertex Shader 컴파일
    ComPtr<ID3DBlob> vsBlob;
    if (!CompileShaderFromFile(L"../../Shaders/Fresnel_VS.hlsl", "main", "vs_5_0", vsBlob.GetAddressOf()))
        return false;

    HRESULT hr = m_device->CreateVertexShader(
        vsBlob->GetBufferPointer(),
        vsBlob->GetBufferSize(),
        nullptr,
        m_vertexShader.GetAddressOf()
    );
    if (FAILED(hr))
        return false;

    // Input Layout 생성
    D3D11_INPUT_ELEMENT_DESC layout[] =
    {
        { "POSITION", 0, DXGI_FORMAT_R32G32B32_FLOAT, 0, 0, D3D11_INPUT_PER_VERTEX_DATA, 0 },
        { "NORMAL", 0, DXGI_FORMAT_R32G32B32_FLOAT, 0, 12, D3D11_INPUT_PER_VERTEX_DATA, 0 },
        { "TEXCOORD", 0, DXGI_FORMAT_R32G32_FLOAT, 0, 24, D3D11_INPUT_PER_VERTEX_DATA, 0 },
    };

    hr = m_device->CreateInputLayout(
        layout,
        ARRAYSIZE(layout),
        vsBlob->GetBufferPointer(),
        vsBlob->GetBufferSize(),
        m_inputLayout.GetAddressOf()
    );
    if (FAILED(hr))
        return false;

    // Pixel Shaders 컴파일 (5단계)
    ComPtr<ID3DBlob> psBlob;

    // Step 1: Basic
    if (!CompileShaderFromFile(L"../../Shaders/Fresnel_Step1_Basic_PS.hlsl", "main", "ps_5_0", psBlob.GetAddressOf()))
        return false;
    hr = m_device->CreatePixelShader(psBlob->GetBufferPointer(), psBlob->GetBufferSize(), nullptr, m_pixelShader_Step1.GetAddressOf());
    if (FAILED(hr)) return false;

    // Step 2: DotNV
    if (!CompileShaderFromFile(L"../../Shaders/Fresnel_Step2_DotNV_PS.hlsl", "main", "ps_5_0", psBlob.GetAddressOf()))
        return false;
    hr = m_device->CreatePixelShader(psBlob->GetBufferPointer(), psBlob->GetBufferSize(), nullptr, m_pixelShader_Step2.GetAddressOf());
    if (FAILED(hr)) return false;

    // Step 3: Invert
    if (!CompileShaderFromFile(L"../../Shaders/Fresnel_Step3_Invert_PS.hlsl", "main", "ps_5_0", psBlob.GetAddressOf()))
        return false;
    hr = m_device->CreatePixelShader(psBlob->GetBufferPointer(), psBlob->GetBufferSize(), nullptr, m_pixelShader_Step3.GetAddressOf());
    if (FAILED(hr)) return false;

    // Step 4: Power
    if (!CompileShaderFromFile(L"../../Shaders/Fresnel_Step4_Power_PS.hlsl", "main", "ps_5_0", psBlob.GetAddressOf()))
        return false;
    hr = m_device->CreatePixelShader(psBlob->GetBufferPointer(), psBlob->GetBufferSize(), nullptr, m_pixelShader_Step4.GetAddressOf());
    if (FAILED(hr)) return false;

    // Step 5: Final
    if (!CompileShaderFromFile(L"../../Shaders/Fresnel_Step5_Final_PS.hlsl", "main", "ps_5_0", psBlob.GetAddressOf()))
        return false;
    hr = m_device->CreatePixelShader(psBlob->GetBufferPointer(), psBlob->GetBufferSize(), nullptr, m_pixelShader_Step5.GetAddressOf());
    if (FAILED(hr)) return false;

    return true;
}

bool FresnelApp::CreateConstantBuffers()
{
    D3D11_BUFFER_DESC cbd = {};
    cbd.Usage = D3D11_USAGE_DYNAMIC;
    cbd.CPUAccessFlags = D3D11_CPU_ACCESS_WRITE;
    cbd.BindFlags = D3D11_BIND_CONSTANT_BUFFER;

    // PerFrame CB
    cbd.ByteWidth = sizeof(PerFrameCB);
    HRESULT hr = m_device->CreateBuffer(&cbd, nullptr, m_perFrameCB.GetAddressOf());
    if (FAILED(hr)) return false;

    // PerObject CB
    cbd.ByteWidth = sizeof(PerObjectCB);
    hr = m_device->CreateBuffer(&cbd, nullptr, m_perObjectCB.GetAddressOf());
    if (FAILED(hr)) return false;

    // FresnelParams CB
    cbd.ByteWidth = sizeof(FresnelParamsCB);
    hr = m_device->CreateBuffer(&cbd, nullptr, m_fresnelParamsCB.GetAddressOf());
    if (FAILED(hr)) return false;

    // ColorParams CB
    cbd.ByteWidth = sizeof(ColorParamsCB);
    hr = m_device->CreateBuffer(&cbd, nullptr, m_colorParamsCB.GetAddressOf());
    if (FAILED(hr)) return false;

    return true;
}

bool FresnelApp::CreateBlendState()
{
    D3D11_BLEND_DESC blendDesc = {};
    blendDesc.RenderTarget[0].BlendEnable = TRUE;
    blendDesc.RenderTarget[0].SrcBlend = D3D11_BLEND_SRC_ALPHA;
    blendDesc.RenderTarget[0].DestBlend = D3D11_BLEND_INV_SRC_ALPHA;
    blendDesc.RenderTarget[0].BlendOp = D3D11_BLEND_OP_ADD;
    blendDesc.RenderTarget[0].SrcBlendAlpha = D3D11_BLEND_ONE;
    blendDesc.RenderTarget[0].DestBlendAlpha = D3D11_BLEND_ZERO;
    blendDesc.RenderTarget[0].BlendOpAlpha = D3D11_BLEND_OP_ADD;
    blendDesc.RenderTarget[0].RenderTargetWriteMask = D3D11_COLOR_WRITE_ENABLE_ALL;

    HRESULT hr = m_device->CreateBlendState(&blendDesc, m_blendState.GetAddressOf());
    return SUCCEEDED(hr);
}

void FresnelApp::Update(float deltaTime)
{
    m_totalTime += deltaTime;

    // 키 입력 처리 (1~5키로 단계 전환)
    if (GetAsyncKeyState('1') & 0x8000) m_currentStep = 1;
    if (GetAsyncKeyState('2') & 0x8000) m_currentStep = 2;
    if (GetAsyncKeyState('3') & 0x8000) m_currentStep = 3;
    if (GetAsyncKeyState('4') & 0x8000) m_currentStep = 4;
    if (GetAsyncKeyState('5') & 0x8000) m_currentStep = 5;

    // 파라미터 조정 (Q/W키: Power, A/S키: Intensity)
    if (GetAsyncKeyState('Q') & 0x8000) m_fresnelPower = max(0.5f, m_fresnelPower - deltaTime);
    if (GetAsyncKeyState('W') & 0x8000) m_fresnelPower = min(10.0f, m_fresnelPower + deltaTime);
    if (GetAsyncKeyState('A') & 0x8000) m_fresnelIntensity = max(0.1f, m_fresnelIntensity - deltaTime);
    if (GetAsyncKeyState('S') & 0x8000) m_fresnelIntensity = min(5.0f, m_fresnelIntensity + deltaTime);

    // 카메라 회전
    UpdateCamera(deltaTime);

    // 윈도우 타이틀 업데이트
    std::wostringstream outs;
    outs.precision(2);
    outs << L"Fresnel Effect - Step " << m_currentStep
         << L" | Power: " << m_fresnelPower
         << L" | Intensity: " << m_fresnelIntensity
         << L" | [1-5] Change Step | [Q/W] Power | [A/S] Intensity";
    SetWindowText(m_hwnd, outs.str().c_str());
}

void FresnelApp::UpdateCamera(float deltaTime)
{
    // 자동 회전
    static float angle = 0.0f;
    angle += deltaTime * 0.3f;

    float radius = 5.0f;
    float x = radius * sinf(angle);
    float z = radius * cosf(angle);

    m_camera.SetPosition(x, 1.0f, z);
    m_camera.LookAt(
        XMFLOAT3(x, 1.0f, z),
        XMFLOAT3(0.0f, 0.0f, 0.0f),
        XMFLOAT3(0.0f, 1.0f, 0.0f)
    );
    m_camera.UpdateViewMatrix();
}

void FresnelApp::Render()
{
    // 화면 클리어
    float clearColor[4] = { 0.1f, 0.1f, 0.15f, 1.0f };
    m_context->ClearRenderTargetView(m_renderTargetView.Get(), clearColor);
    m_context->ClearDepthStencilView(m_depthStencilView.Get(), D3D11_CLEAR_DEPTH, 1.0f, 0);

    // PerFrame CB 업데이트
    D3D11_MAPPED_SUBRESOURCE mappedResource;
    HRESULT hr = m_context->Map(m_perFrameCB.Get(), 0, D3D11_MAP_WRITE_DISCARD, 0, &mappedResource);
    if (SUCCEEDED(hr))
    {
        PerFrameCB* cb = reinterpret_cast<PerFrameCB*>(mappedResource.pData);
        cb->ViewProj = XMMatrixTranspose(m_camera.GetViewProj());
        cb->CameraPos = m_camera.GetPosition();
        cb->Time = m_totalTime;
        m_context->Unmap(m_perFrameCB.Get(), 0);
    }

    // PerObject CB 업데이트
    hr = m_context->Map(m_perObjectCB.Get(), 0, D3D11_MAP_WRITE_DISCARD, 0, &mappedResource);
    if (SUCCEEDED(hr))
    {
        PerObjectCB* cb = reinterpret_cast<PerObjectCB*>(mappedResource.pData);
        cb->World = XMMatrixTranspose(XMMatrixIdentity());
        cb->Color = XMFLOAT4(1.0f, 1.0f, 1.0f, 1.0f);
        m_context->Unmap(m_perObjectCB.Get(), 0);
    }

    // FresnelParams CB 업데이트 (Step 4, 5에서 사용)
    hr = m_context->Map(m_fresnelParamsCB.Get(), 0, D3D11_MAP_WRITE_DISCARD, 0, &mappedResource);
    if (SUCCEEDED(hr))
    {
        FresnelParamsCB* cb = reinterpret_cast<FresnelParamsCB*>(mappedResource.pData);
        cb->FresnelPower = m_fresnelPower;
        cb->FresnelIntensity = m_fresnelIntensity;
        m_context->Unmap(m_fresnelParamsCB.Get(), 0);
    }

    // ColorParams CB 업데이트 (Step 5에서 사용)
    hr = m_context->Map(m_colorParamsCB.Get(), 0, D3D11_MAP_WRITE_DISCARD, 0, &mappedResource);
    if (SUCCEEDED(hr))
    {
        ColorParamsCB* cb = reinterpret_cast<ColorParamsCB*>(mappedResource.pData);
        cb->FresnelColor = m_fresnelColor;
        m_context->Unmap(m_colorParamsCB.Get(), 0);
    }

    // 상수 버퍼 바인딩
    m_context->VSSetConstantBuffers(0, 1, m_perFrameCB.GetAddressOf());
    m_context->VSSetConstantBuffers(1, 1, m_perObjectCB.GetAddressOf());
    m_context->PSSetConstantBuffers(0, 1, m_perFrameCB.GetAddressOf());
    m_context->PSSetConstantBuffers(1, 1, m_perObjectCB.GetAddressOf());
    m_context->PSSetConstantBuffers(2, 1, m_fresnelParamsCB.GetAddressOf());
    m_context->PSSetConstantBuffers(3, 1, m_colorParamsCB.GetAddressOf());

    // 쉐이더 설정
    m_context->IASetInputLayout(m_inputLayout.Get());
    m_context->VSSetShader(m_vertexShader.Get(), nullptr, 0);

    // 현재 단계에 맞는 Pixel Shader 선택
    ID3D11PixelShader* ps = nullptr;
    switch (m_currentStep)
    {
    case 1: ps = m_pixelShader_Step1.Get(); break;
    case 2: ps = m_pixelShader_Step2.Get(); break;
    case 3: ps = m_pixelShader_Step3.Get(); break;
    case 4: ps = m_pixelShader_Step4.Get(); break;
    case 5: ps = m_pixelShader_Step5.Get(); break;
    default: ps = m_pixelShader_Step1.Get(); break;
    }
    m_context->PSSetShader(ps, nullptr, 0);

    // Step 5에서는 블렌딩 활성화
    if (m_currentStep == 5)
    {
        float blendFactor[4] = { 1.0f, 1.0f, 1.0f, 1.0f };
        m_context->OMSetBlendState(m_blendState.Get(), blendFactor, 0xFFFFFFFF);
    }
    else
    {
        m_context->OMSetBlendState(nullptr, nullptr, 0xFFFFFFFF);
    }

    // 구체 렌더링
    m_sphere.Draw(m_context.Get());
}
