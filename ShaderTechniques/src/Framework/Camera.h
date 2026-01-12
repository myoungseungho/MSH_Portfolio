#pragma once

#include <DirectXMath.h>

using namespace DirectX;

class Camera
{
public:
    Camera();
    ~Camera();

    void SetPosition(float x, float y, float z);
    void SetPosition(const XMFLOAT3& position);
    void SetLens(float fovY, float aspect, float nearZ, float farZ);
    void LookAt(const XMFLOAT3& pos, const XMFLOAT3& target, const XMFLOAT3& up);

    // 행렬 얻기
    XMMATRIX GetView() const;
    XMMATRIX GetProj() const;
    XMMATRIX GetViewProj() const;

    // 카메라 위치
    XMFLOAT3 GetPosition() const { return m_position; }
    XMVECTOR GetPositionXM() const { return XMLoadFloat3(&m_position); }

    // 마우스 회전
    void Pitch(float angle);
    void RotateY(float angle);

    // 업데이트
    void UpdateViewMatrix();

private:
    XMFLOAT3 m_position;
    XMFLOAT3 m_right;
    XMFLOAT3 m_up;
    XMFLOAT3 m_look;

    float m_nearZ;
    float m_farZ;
    float m_aspect;
    float m_fovY;

    XMFLOAT4X4 m_view;
    XMFLOAT4X4 m_proj;
};
