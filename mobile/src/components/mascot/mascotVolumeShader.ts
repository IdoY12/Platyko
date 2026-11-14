import { Skia } from "@shopify/react-native-skia";

/**
 * Gives the layered artwork volume. The bust is treated as three domes (head, bill, body): each
 * pixel is shifted by its height on the dome when the head turns, so a turn reads as rotation of
 * a solid form; the same domes give a surface normal for a moving light, a cyan rim for the glow
 * state, and a bulge for the cheeks. With every input at zero the shader returns the artwork
 * untouched, which is what keeps the resting mascot identical to the logo.
 */
const VOLUME_SHADER_SOURCE = `
uniform shader image;
uniform float scale;
uniform float2 viewOrigin;
uniform float2 headCenter;
uniform float2 headRadius;
uniform float2 billCenter;
uniform float2 billRadius;
uniform float2 bodyCenter;
uniform float2 bodyRadius;
uniform float2 leftCheek;
uniform float2 rightCheek;
uniform float cheekRadius;
uniform float2 turn;
uniform float2 light;
uniform float puff;
uniform float glow;
uniform float3 glowColor;
uniform float2 fade;

float dome(float2 point, float2 center, float2 radius) {
  float2 unit = (point - center) / radius;
  return sqrt(max(0.0, 1.0 - dot(unit, unit)));
}

float2 bulge(float2 point, float2 center) {
  float2 offset = point - center;
  float falloff = max(0.0, 1.0 - length(offset) / cheekRadius);
  return offset * falloff * falloff * puff * -0.22;
}

half4 main(float2 xy) {
  float2 art = xy / scale + viewOrigin;
  float head = dome(art, headCenter, headRadius);
  float bill = dome(art, billCenter, billRadius);
  float body = dome(art, bodyCenter, bodyRadius);
  float height = max(head * 0.75 + bill * 0.55, body * 0.45);

  float2 shift = turn * height * 16.0 + bulge(art, leftCheek) + bulge(art, rightCheek);
  half4 color = image.eval((art - shift - viewOrigin) * scale);

  float2 slope = head > 0.0 ? (art - headCenter) / headRadius : (art - bodyCenter) / bodyRadius;
  float lit = dot(slope, light) * 0.16;
  color.rgb = clamp(color.rgb * (1.0 + lit), 0.0, 1.0);

  float rim = pow(1.0 - clamp(height, 0.0, 1.0), 3.0) * (head > 0.0 ? 1.0 : 0.55);
  color.rgb += glowColor * glow * rim * 0.75 * color.a;

  float visible = 1.0 - smoothstep(fade.x, fade.y, art.y);
  return color * visible;
}`;

const compiled = Skia.RuntimeEffect.Make(VOLUME_SHADER_SOURCE);
if (!compiled) throw new Error("The mascot volume shader failed to compile");

export const mascotVolumeShader = compiled;
