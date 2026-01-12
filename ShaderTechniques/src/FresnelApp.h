#pragma once

#include "Framework/DXApp.h"
#include "Framework/Camera.h"
#include "Framework/Mesh.h"

struct PerFrameCB
{
    XMMATRIX ViewProj;
    XMFLOAT3 CameraPos;
    float Time;
};

struct PerObjectCB
{
    XMMATRIX World;
    XMFLOAT4 Color;
};

struct FresnelParamsCB
{
    float FresnelPower;
    float FresnelIntensity;
    XMFLOAT2 Padding;
};

struct ColorParamsCB
{
    XMFLOAT4 FresnelColor;
};

class FresnelApp : public DXApp
{
public:
    FresnelApp();
    ~FresnelApp();

protected:
    virtual bool LoadContent() override;
    virtual void UnloadContent() override;
    virtual void Update(float deltaTime) override;
    virtual void Render() override;

private:
    bool CreateShaders();
    bool CreateConstantBuffers();
    bool CreateBlendState();
    void UpdateCamera(float deltaTime);

    // 쉐이더
    ComPtr<ID3D11VertexShader> m_vertexShader;
    ComPtr<ID3D11PixelShader> m_pixelShader_Step1; // 기본
    ComPtr<ID3D11PixelShader> m_pixelShader_Step2; // dot(N,V)
    ComPtr<ID3D11PixelShader> m_pixelShader_Step3; // 반전
    ComPtr<ID3D11PixelShader> m_pixelShader_Step4; // pow()
    ComPtr<ID3D11PixelShader> m_pixelShader_Step5; // 최종
    ComPtr<ID3D11InputLayout> m_inputLayout;

    // 상수 버퍼
    ComPtr<ID3D11Buffer> m_perFrameCB;
    ComPtr<ID3D11Buffer> m_perObjectCB;
    ComPtr<ID3D11Buffer> m_fresnelParamsCB;
    ComPtr<ID3D11Buffer> m_colorParamsCB;

    // 블렌드 스테이트
    ComPtr<ID3D11BlendState> m_blendState;

    // 메시 & 카메라
    Mesh m_sphere;
    Camera m_camera;

    // 파라미터
    float m_totalTime;
    float m_fresnelPower;
    float m_fresnelIntensity;
    XMFLOAT4 m_fresnelColor;

    // 현재 단계 (1~5)
    int m_currentStep;
};
