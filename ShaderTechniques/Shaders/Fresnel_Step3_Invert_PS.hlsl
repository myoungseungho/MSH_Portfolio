// Step 3: 1 - dot(N, V) 반전
// 목적: 가장자리를 밝게 만들기
// 결과: 정면은 어둡고(0), 가장자리는 밝다(1)

cbuffer PerFrame : register(b0)
{
    matrix ViewProj;
    float3 CameraPos;
    float Time;
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
    float3 N = normalize(input.Normal);
    float3 V = normalize(CameraPos - input.WorldPos);

    float NdotV = saturate(dot(N, V));

    // 반전! (1에서 빼기)
    float fresnel = 1.0f - NdotV;

    return float4(fresnel, fresnel, fresnel, 1.0f);
}
