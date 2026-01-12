// Step 5: 최종 색상 적용
// 목적: 프레넬 값에 색상을 곱해서 예쁜 글로우 효과
// 결과: 청록색 외곽 글로우 완성!

cbuffer PerFrame : register(b0)
{
    matrix ViewProj;
    float3 CameraPos;
    float Time;
};

cbuffer FresnelParams : register(b2)
{
    float FresnelPower;
    float FresnelIntensity;
    float2 Padding;
};

cbuffer ColorParams : register(b3)
{
    float4 FresnelColor;  // (0.3, 0.8, 1.0, 1.0) - 밝은 청록색
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
    float fresnel = pow(1.0f - NdotV, FresnelPower);
    fresnel *= FresnelIntensity;

    // 최종 색상 = 프레넬 * 색상
    float4 finalColor = FresnelColor * fresnel;

    // 알파값도 프레넬 적용 (투명도)
    finalColor.a = fresnel;

    return finalColor;
}
