// Step 1: 기본 단색 구체
// 목적: 기본 렌더링이 잘 되는지 확인

cbuffer PerObject : register(b1)
{
    float4 Color;
};

struct PS_INPUT
{
    float4 Position : SV_POSITION;
    float3 WorldPos : POSITION;
    float3 Normal : NORMAL;
    float2 TexCoord : TEXCOORD;
};

float4 main(PS_INPUT input) : SV_TARGET
{
    // 단순히 설정한 색상 리턴 (회색)
    return float4(0.5f, 0.5f, 0.5f, 1.0f);
}
