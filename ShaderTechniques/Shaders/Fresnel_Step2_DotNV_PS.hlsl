// Step 2: dot(N, V) 시각화
// 목적: 노말과 시선 벡터의 내적 값 확인
// 결과: 정면은 밝고(1), 가장자리는 어둡다(0)

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
    // 노말 벡터 정규화
    float3 N = normalize(input.Normal);

    // 시선 벡터 (픽셀 → 카메라)
    float3 V = normalize(CameraPos - input.WorldPos);

    // 내적 계산
    float NdotV = saturate(dot(N, V));

    // 회색조로 시각화
    return float4(NdotV, NdotV, NdotV, 1.0f);
}
