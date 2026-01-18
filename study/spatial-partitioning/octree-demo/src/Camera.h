#pragma once
#include <DirectXMath.h>

using namespace DirectX;

class Camera {
public:
    XMFLOAT3 position;
    XMFLOAT3 target;
    XMFLOAT3 up;
    float fov;
    float aspectRatio;
    float nearPlane;
    float farPlane;

    Camera()
        : position(0.0f, 20.0f, -30.0f)
        , target(0.0f, 0.0f, 0.0f)
        , up(0.0f, 1.0f, 0.0f)
        , fov(XM_PIDIV4)
        , aspectRatio(16.0f / 9.0f)
        , nearPlane(0.1f)
        , farPlane(1000.0f) {
    }

    XMMATRIX GetViewMatrix() const {
        XMVECTOR posVec = XMLoadFloat3(&position);
        XMVECTOR targetVec = XMLoadFloat3(&target);
        XMVECTOR upVec = XMLoadFloat3(&up);
        return XMMatrixLookAtLH(posVec, targetVec, upVec);
    }

    XMMATRIX GetProjectionMatrix() const {
        return XMMatrixPerspectiveFovLH(fov, aspectRatio, nearPlane, farPlane);
    }

    void Rotate(float yaw, float pitch) {
        // Simple orbit camera
        static float currentYaw = 0.0f;
        static float currentPitch = XM_PIDIV4;

        currentYaw += yaw;
        currentPitch += pitch;

        // Clamp pitch
        currentPitch = max(-XM_PIDIV2 + 0.1f, min(XM_PIDIV2 - 0.1f, currentPitch));

        float radius = 50.0f;
        position.x = radius * cosf(currentPitch) * sinf(currentYaw);
        position.y = radius * sinf(currentPitch);
        position.z = radius * cosf(currentPitch) * cosf(currentYaw);
    }
};
