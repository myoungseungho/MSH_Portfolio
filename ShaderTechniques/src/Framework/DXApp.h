#pragma once

#include <d3d11.h>
#include <DirectXMath.h>
#include <wrl/client.h>
#include <string>
#include <Windows.h>

using Microsoft::WRL::ComPtr;
using namespace DirectX;

class DXApp
{
public:
    DXApp();
    virtual ~DXApp();

    bool Initialize(HINSTANCE hInstance, int width, int height, const std::wstring& title);
    int Run();
    void Shutdown();

protected:
    virtual bool LoadContent() = 0;
    virtual void UnloadContent() = 0;
    virtual void Update(float deltaTime) = 0;
    virtual void Render() = 0;
    virtual void OnResize();

    // DirectX 객체
    ComPtr<ID3D11Device> m_device;
    ComPtr<ID3D11DeviceContext> m_context;
    ComPtr<IDXGISwapChain> m_swapChain;
    ComPtr<ID3D11RenderTargetView> m_renderTargetView;
    ComPtr<ID3D11DepthStencilView> m_depthStencilView;
    ComPtr<ID3D11Texture2D> m_depthStencilBuffer;
    ComPtr<ID3D11RasterizerState> m_rasterizerState;
    D3D11_VIEWPORT m_viewport;

    HWND m_hwnd;
    int m_width, m_height;
    bool m_isRunning;

    // 쉐이더 컴파일 헬퍼
    bool CompileShaderFromFile(const std::wstring& filename, const char* entryPoint,
                               const char* shaderModel, ID3DBlob** blobOut);

private:
    bool InitWindow(HINSTANCE hInstance, const std::wstring& title);
    bool InitD3D();
    void CalculateFrameStats();

    static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam);

    // FPS 계산
    float m_frameTime;
    int m_frameCount;
    float m_totalTime;
};
