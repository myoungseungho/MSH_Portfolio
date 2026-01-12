// Fresnel Vertex Shader (공통)
cbuffer PerFrame : register(b0)
{
    matrix ViewProj;
    float3 CameraPos;
    float Time;
};

cbuffer PerObject : register(b1)
{
    matrix World;
    float4 Color;
};

struct VS_INPUT
{
    float3 Position : POSITION;
    float3 Normal : NORMAL;
    float2 TexCoord : TEXCOORD;
};

struct PS_INPUT
{
    float4 Position : SV_POSITION;
    float3 WorldPos : POSITION;
    float3 Normal : NORMAL;
    float2 TexCoord : TEXCOORD;
};

PS_INPUT main(VS_INPUT input)
{
    PS_INPUT output;

    // 월드 공간 변환
    float4 worldPos = mul(float4(input.Position, 1.0f), World);
    output.WorldPos = worldPos.xyz;

    // 투영 공간 변환
    output.Position = mul(worldPos, ViewProj);

    // 노말 월드 공간 변환 (정규화)
    output.Normal = normalize(mul(input.Normal, (float3x3)World));

    output.TexCoord = input.TexCoord;

    return output;
}
