// Step 4: pow() 적용으로 가장자리 강조
// 목적: power 값으로 곡선 조절
// 결과: 가장자리만 더 강하게 빛남

cbuffer PerFrame : register(b0)
{
    matrix ViewProj;
    float3 CameraPos;
    float Time;
};

cbuffer FresnelParams : register(b2)
{
    float FresnelPower;      // 3.0
    float FresnelIntensity;  // 2.0
    float2 Padding;
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
    float fresnel = 1.0f - NdotV;

    // pow() 적용 - 가장자리만 강조!
    fresnel = pow(fresnel, FresnelPower);

    // 강도 배율 적용
    fresnel *= FresnelIntensity;

    return float4(fresnel, fresnel, fresnel, 1.0f);
}
