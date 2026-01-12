#include "Camera.h"

Camera::Camera()
    : m_position(0.0f, 0.0f, 0.0f)
    , m_right(1.0f, 0.0f, 0.0f)
    , m_up(0.0f, 1.0f, 0.0f)
    , m_look(0.0f, 0.0f, 1.0f)
    , m_nearZ(0.1f)
    , m_farZ(1000.0f)
    , m_aspect(16.0f / 9.0f)
    , m_fovY(XM_PIDIV4)
{
    XMStoreFloat4x4(&m_view, XMMatrixIdentity());
    XMStoreFloat4x4(&m_proj, XMMatrixIdentity());
}

Camera::~Camera()
{
}

void Camera::SetPosition(float x, float y, float z)
{
    m_position = XMFLOAT3(x, y, z);
}

void Camera::SetPosition(const XMFLOAT3& position)
{
    m_position = position;
}

void Camera::SetLens(float fovY, float aspect, float nearZ, float farZ)
{
    m_fovY = fovY;
    m_aspect = aspect;
    m_nearZ = nearZ;
    m_farZ = farZ;

    XMMATRIX P = XMMatrixPerspectiveFovLH(m_fovY, m_aspect, m_nearZ, m_farZ);
    XMStoreFloat4x4(&m_proj, P);
}

void Camera::LookAt(const XMFLOAT3& pos, const XMFLOAT3& target, const XMFLOAT3& up)
{
    XMVECTOR P = XMLoadFloat3(&pos);
    XMVECTOR T = XMLoadFloat3(&target);
    XMVECTOR U = XMLoadFloat3(&up);

    XMVECTOR L = XMVector3Normalize(XMVectorSubtract(T, P));
    XMVECTOR R = XMVector3Normalize(XMVector3Cross(U, L));
    XMVECTOR Up = XMVector3Cross(L, R);

    XMStoreFloat3(&m_position, P);
    XMStoreFloat3(&m_look, L);
    XMStoreFloat3(&m_right, R);
    XMStoreFloat3(&m_up, Up);
}

void Camera::Pitch(float angle)
{
    XMMATRIX R = XMMatrixRotationAxis(XMLoadFloat3(&m_right), angle);

    XMStoreFloat3(&m_up, XMVector3TransformNormal(XMLoadFloat3(&m_up), R));
    XMStoreFloat3(&m_look, XMVector3TransformNormal(XMLoadFloat3(&m_look), R));
}

void Camera::RotateY(float angle)
{
    XMMATRIX R = XMMatrixRotationY(angle);

    XMStoreFloat3(&m_right, XMVector3TransformNormal(XMLoadFloat3(&m_right), R));
    XMStoreFloat3(&m_up, XMVector3TransformNormal(XMLoadFloat3(&m_up), R));
    XMStoreFloat3(&m_look, XMVector3TransformNormal(XMLoadFloat3(&m_look), R));
}

void Camera::UpdateViewMatrix()
{
    XMVECTOR R = XMLoadFloat3(&m_right);
    XMVECTOR U = XMLoadFloat3(&m_up);
    XMVECTOR L = XMLoadFloat3(&m_look);
    XMVECTOR P = XMLoadFloat3(&m_position);

    // 정규 직교화
    L = XMVector3Normalize(L);
    U = XMVector3Normalize(XMVector3Cross(L, R));
    R = XMVector3Cross(U, L);

    float x = -XMVectorGetX(XMVector3Dot(P, R));
    float y = -XMVectorGetX(XMVector3Dot(P, U));
    float z = -XMVectorGetX(XMVector3Dot(P, L));

    XMStoreFloat3(&m_right, R);
    XMStoreFloat3(&m_up, U);
    XMStoreFloat3(&m_look, L);

    m_view(0, 0) = m_right.x;
    m_view(1, 0) = m_right.y;
    m_view(2, 0) = m_right.z;
    m_view(3, 0) = x;

    m_view(0, 1) = m_up.x;
    m_view(1, 1) = m_up.y;
    m_view(2, 1) = m_up.z;
    m_view(3, 1) = y;

    m_view(0, 2) = m_look.x;
    m_view(1, 2) = m_look.y;
    m_view(2, 2) = m_look.z;
    m_view(3, 2) = z;

    m_view(0, 3) = 0.0f;
    m_view(1, 3) = 0.0f;
    m_view(2, 3) = 0.0f;
    m_view(3, 3) = 1.0f;
}

XMMATRIX Camera::GetView() const
{
    return XMLoadFloat4x4(&m_view);
}

XMMATRIX Camera::GetProj() const
{
    return XMLoadFloat4x4(&m_proj);
}

XMMATRIX Camera::GetViewProj() const
{
    return XMMatrixMultiply(GetView(), GetProj());
}
