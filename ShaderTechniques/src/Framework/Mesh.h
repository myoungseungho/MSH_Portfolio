#pragma once

#include <d3d11.h>
#include <DirectXMath.h>
#include <wrl/client.h>
#include <vector>

using Microsoft::WRL::ComPtr;
using namespace DirectX;

struct Vertex
{
    XMFLOAT3 Position;
    XMFLOAT3 Normal;
    XMFLOAT2 TexCoord;
};

class Mesh
{
public:
    Mesh();
    ~Mesh();

    bool CreateSphere(ID3D11Device* device, float radius, int sliceCount, int stackCount);
    void Draw(ID3D11DeviceContext* context);

    void Release();

private:
    ComPtr<ID3D11Buffer> m_vertexBuffer;
    ComPtr<ID3D11Buffer> m_indexBuffer;
    UINT m_indexCount;
    UINT m_vertexCount;
};
