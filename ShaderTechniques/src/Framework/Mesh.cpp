#include "Mesh.h"
#include <cmath>

Mesh::Mesh()
    : m_indexCount(0)
    , m_vertexCount(0)
{
}

Mesh::~Mesh()
{
    Release();
}

bool Mesh::CreateSphere(ID3D11Device* device, float radius, int sliceCount, int stackCount)
{
    std::vector<Vertex> vertices;
    std::vector<UINT> indices;

    // Top vertex
    Vertex topVertex;
    topVertex.Position = XMFLOAT3(0.0f, radius, 0.0f);
    topVertex.Normal = XMFLOAT3(0.0f, 1.0f, 0.0f);
    topVertex.TexCoord = XMFLOAT2(0.0f, 0.0f);
    vertices.push_back(topVertex);

    float phiStep = XM_PI / stackCount;
    float thetaStep = 2.0f * XM_PI / sliceCount;

    // Stacks (rings)
    for (int i = 1; i <= stackCount - 1; ++i)
    {
        float phi = i * phiStep;

        for (int j = 0; j <= sliceCount; ++j)
        {
            float theta = j * thetaStep;

            Vertex v;

            // Spherical to Cartesian
            v.Position.x = radius * sinf(phi) * cosf(theta);
            v.Position.y = radius * cosf(phi);
            v.Position.z = radius * sinf(phi) * sinf(theta);

            // Normal (normalized position vector)
            XMVECTOR p = XMLoadFloat3(&v.Position);
            XMStoreFloat3(&v.Normal, XMVector3Normalize(p));

            // Texture coordinates
            v.TexCoord.x = theta / (XM_PI * 2);
            v.TexCoord.y = phi / XM_PI;

            vertices.push_back(v);
        }
    }

    // Bottom vertex
    Vertex bottomVertex;
    bottomVertex.Position = XMFLOAT3(0.0f, -radius, 0.0f);
    bottomVertex.Normal = XMFLOAT3(0.0f, -1.0f, 0.0f);
    bottomVertex.TexCoord = XMFLOAT2(0.0f, 1.0f);
    vertices.push_back(bottomVertex);

    // Top cap indices
    for (int i = 1; i <= sliceCount; ++i)
    {
        indices.push_back(0);
        indices.push_back(i + 1);
        indices.push_back(i);
    }

    // Rings indices
    int baseIndex = 1;
    int ringVertexCount = sliceCount + 1;
    for (int i = 0; i < stackCount - 2; ++i)
    {
        for (int j = 0; j < sliceCount; ++j)
        {
            indices.push_back(baseIndex + i * ringVertexCount + j);
            indices.push_back(baseIndex + i * ringVertexCount + j + 1);
            indices.push_back(baseIndex + (i + 1) * ringVertexCount + j);

            indices.push_back(baseIndex + (i + 1) * ringVertexCount + j);
            indices.push_back(baseIndex + i * ringVertexCount + j + 1);
            indices.push_back(baseIndex + (i + 1) * ringVertexCount + j + 1);
        }
    }

    // Bottom cap indices
    int southPoleIndex = (int)vertices.size() - 1;
    baseIndex = southPoleIndex - ringVertexCount;

    for (int i = 0; i < sliceCount; ++i)
    {
        indices.push_back(southPoleIndex);
        indices.push_back(baseIndex + i);
        indices.push_back(baseIndex + i + 1);
    }

    m_vertexCount = static_cast<UINT>(vertices.size());
    m_indexCount = static_cast<UINT>(indices.size());

    // Vertex Buffer 생성
    D3D11_BUFFER_DESC vbd = {};
    vbd.Usage = D3D11_USAGE_IMMUTABLE;
    vbd.ByteWidth = sizeof(Vertex) * m_vertexCount;
    vbd.BindFlags = D3D11_BIND_VERTEX_BUFFER;

    D3D11_SUBRESOURCE_DATA vertexData = {};
    vertexData.pSysMem = vertices.data();

    HRESULT hr = device->CreateBuffer(&vbd, &vertexData, m_vertexBuffer.GetAddressOf());
    if (FAILED(hr))
        return false;

    // Index Buffer 생성
    D3D11_BUFFER_DESC ibd = {};
    ibd.Usage = D3D11_USAGE_IMMUTABLE;
    ibd.ByteWidth = sizeof(UINT) * m_indexCount;
    ibd.BindFlags = D3D11_BIND_INDEX_BUFFER;

    D3D11_SUBRESOURCE_DATA indexData = {};
    indexData.pSysMem = indices.data();

    hr = device->CreateBuffer(&ibd, &indexData, m_indexBuffer.GetAddressOf());
    if (FAILED(hr))
        return false;

    return true;
}

void Mesh::Draw(ID3D11DeviceContext* context)
{
    UINT stride = sizeof(Vertex);
    UINT offset = 0;

    context->IASetVertexBuffers(0, 1, m_vertexBuffer.GetAddressOf(), &stride, &offset);
    context->IASetIndexBuffer(m_indexBuffer.Get(), DXGI_FORMAT_R32_UINT, 0);
    context->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);

    context->DrawIndexed(m_indexCount, 0, 0);
}

void Mesh::Release()
{
    m_vertexBuffer.Reset();
    m_indexBuffer.Reset();
}
