import {
  Canvas,
  Circle,
  FilterMode,
  Group,
  Image,
  MipmapMode,
  Paint,
  Path,
  RadialGradient,
  RuntimeShader,
  Skia,
  useImage,
  vec,
  type SkImage,
} from "@shopify/react-native-skia";
import { useDerivedValue, type DerivedValue } from "react-native-reanimated";
import { palette, scene } from "@/theme/tokens";
import {
  ART_GEOMETRY,
  ART_VIEW,
  BILL_VOLUME,
  BODY_VOLUME,
  BUST_FADE,
  BUST_PIVOT,
  CHEEK_RADIUS,
  HEAD_VOLUME,
  LAYER_FRAMES,
  LAYER_SOURCES,
  LEFT_CHEEK,
  RIGHT_CHEEK,
  type LayerName,
} from "./mascotArt";
import { MascotSceneBack, MascotSceneFront } from "./MascotScene";
import { mascotVolumeShader } from "./mascotVolumeShader";
import type { MascotFrame } from "./useMascotRig";

type Props = { frame: DerivedValue<MascotFrame>; width: number };

/** How far each layer travels, in artwork pixels, for a full head turn: nearer layers move more. */
const PARALLAX = { head: 10, eyes: 8, brows: 6, bill: 16, tuft: -5, body: -3 } as const;
const PITCH_RATIO = 0.75;

const HALO_CENTER = vec(632, 650);
const HALO_RADIUS = 470;

/** The artwork is drawn well below its native size; mipmaps keep the fur from shimmering. */
const SMOOTH_SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear };

const toRadians = (degrees: number) => {
  "worklet";
  return (degrees * Math.PI) / 180;
};

const mouthCrease = (() => {
  const path = Skia.Path.Make();
  ART_GEOMETRY.mouthCrease.forEach((point, index) => (index === 0 ? path.moveTo(point.x, point.y) : path.lineTo(point.x, point.y)));
  return path;
})();

type EyeGeometry = typeof ART_GEOMETRY.leftEye;

const eyeOpening = (eye: EyeGeometry, grow: number) => {
  const path = Skia.Path.Make();
  path.addOval(Skia.XYWHRect(eye.x - grow, eye.y - grow, eye.width + grow * 2, eye.height + grow * 2));
  return path;
};
const leftEyeOpening = eyeOpening(ART_GEOMETRY.leftEye, 0);
const rightEyeOpening = eyeOpening(ART_GEOMETRY.rightEye, 0);
/** Lid edges are drawn slightly past the opening so they meet the eye's own outline. */
const leftLidLineArea = eyeOpening(ART_GEOMETRY.leftEye, 5);
const rightLidLineArea = eyeOpening(ART_GEOMETRY.rightEye, 5);

/** The lids' edges: the upper lid comes down as a curve, the lower lid rises for a smile. */
function lidEdges(eye: EyeGeometry, upper: number, lower: number) {
  "worklet";
  const margin = 14;
  const left = eye.x - margin;
  const right = eye.x + eye.width + margin;
  const top = eye.y - margin;
  const bottom = eye.y + eye.height + margin;
  const height = bottom - top;
  const middle = (left + right) / 2;
  const upperEdge = top + height * upper;
  const lowerEdge = bottom - height * lower;
  const cover = Skia.Path.Make();
  const lines = Skia.Path.Make();
  if (upper > 0.01) {
    const sag = 26 * (1 - upper) + 4;
    cover.moveTo(left, top);
    cover.lineTo(right, top);
    cover.lineTo(right, upperEdge);
    cover.quadTo(middle, upperEdge + sag, left, upperEdge);
    cover.close();
    lines.moveTo(right - margin, upperEdge + sag * 0.12);
    lines.quadTo(middle, upperEdge + sag, left + margin, upperEdge + sag * 0.12);
  }
  if (lower > 0.01) {
    const arch = 46;
    cover.moveTo(left, bottom);
    cover.lineTo(right, bottom);
    cover.lineTo(right, lowerEdge);
    cover.quadTo(middle, lowerEdge - arch, left, lowerEdge);
    cover.close();
    lines.moveTo(right - margin, lowerEdge - arch * 0.12);
    lines.quadTo(middle, lowerEdge - arch, left + margin, lowerEdge - arch * 0.12);
  }
  return { cover, lines };
}

function Layer({ name, image }: { name: LayerName; image: SkImage }) {
  const box = LAYER_FRAMES[name];
  return <Image image={image} x={box.x} y={box.y} width={box.width} height={box.height} fit="fill" sampling={SMOOTH_SAMPLING} />;
}

function useLayerImages(): Record<LayerName, SkImage> | null {
  const images = {
    body: useImage(LAYER_SOURCES.body),
    head: useImage(LAYER_SOURCES.head),
    tuft: useImage(LAYER_SOURCES.tuft),
    browLeft: useImage(LAYER_SOURCES.browLeft),
    browRight: useImage(LAYER_SOURCES.browRight),
    irisLeft: useImage(LAYER_SOURCES.irisLeft),
    irisRight: useImage(LAYER_SOURCES.irisRight),
    billLower: useImage(LAYER_SOURCES.billLower),
    billUpper: useImage(LAYER_SOURCES.billUpper),
    eyelidLeft: useImage(LAYER_SOURCES.eyelidLeft),
    eyelidRight: useImage(LAYER_SOURCES.eyelidRight),
  };
  return Object.values(images).every(Boolean) ? (images as Record<LayerName, SkImage>) : null;
}

const browCenter = (name: "browLeft" | "browRight") => {
  const box = LAYER_FRAMES[name];
  return vec(box.x + box.width / 2, box.y + box.height / 2);
};

/** The logo platypus drawn from its layers, with depth, light and the scene around it. */
export function MascotCanvas({ frame, width }: Props) {
  const images = useLayerImages();
  const viewScale = width / ART_VIEW.width;
  const height = width * (ART_VIEW.height / ART_VIEW.width);
  const rootTransform = [{ scale: viewScale }, { translateX: -ART_VIEW.x }, { translateY: -ART_VIEW.y }];

  const bustTransform = useDerivedValue(() => {
    const { bustOffsetY, bustRotation, bustScaleX, bustScaleY } = frame.get();
    return [{ translateY: bustOffsetY }, { rotate: toRadians(bustRotation) }, { scaleX: bustScaleX }, { scaleY: bustScaleY }];
  });
  const bodyTransform = useDerivedValue(() => [{ translateX: frame.get().headYaw * PARALLAX.body }]);
  const headTransform = useDerivedValue(() => {
    const { headYaw, headPitch, headOffsetY, headTilt } = frame.get();
    return [
      { translateX: headYaw * PARALLAX.head },
      { translateY: headPitch * PARALLAX.head * PITCH_RATIO + headOffsetY },
      { rotate: toRadians(headTilt) },
    ];
  });
  const tuftTransform = useDerivedValue(() => {
    const { headYaw, headPitch, tuftSway, warmth } = frame.get();
    return [
      { translateX: headYaw * PARALLAX.tuft },
      { translateY: headPitch * PARALLAX.tuft * PITCH_RATIO },
      { rotate: toRadians(tuftSway - headYaw * 4) },
      { scale: 1 + warmth * 0.22 },
    ];
  });
  const leftBrowTransform = useDerivedValue(() => {
    const { headYaw, headPitch, browLeftOffsetY, browTilt } = frame.get();
    return [
      { translateX: headYaw * PARALLAX.brows },
      { translateY: headPitch * PARALLAX.brows * PITCH_RATIO + browLeftOffsetY },
      { rotate: toRadians(-browTilt) },
    ];
  });
  const rightBrowTransform = useDerivedValue(() => {
    const { headYaw, headPitch, browRightOffsetY, browTilt } = frame.get();
    return [
      { translateX: headYaw * PARALLAX.brows },
      { translateY: headPitch * PARALLAX.brows * PITCH_RATIO + browRightOffsetY },
      { rotate: toRadians(browTilt) },
    ];
  });
  const eyesTransform = useDerivedValue(() => {
    const { headYaw, headPitch } = frame.get();
    return [{ translateX: headYaw * PARALLAX.eyes * 0.4 }, { translateY: headPitch * PARALLAX.eyes * 0.4 * PITCH_RATIO }];
  });
  const irisTransform = useDerivedValue(() => {
    const { headYaw, headPitch, gazeX, gazeY } = frame.get();
    return [{ translateX: headYaw * PARALLAX.eyes + gazeX }, { translateY: headPitch * PARALLAX.eyes * PITCH_RATIO + gazeY }];
  });
  const billTransform = useDerivedValue(() => {
    const { headYaw, headPitch, billJitterX } = frame.get();
    return [{ translateX: headYaw * PARALLAX.bill + billJitterX }, { translateY: headPitch * PARALLAX.bill * PITCH_RATIO }];
  });
  const lowerBillTransform = useDerivedValue(() => [{ translateY: frame.get().billOpen }]);
  const mouthTransform = useDerivedValue(() => [{ translateY: frame.get().billOpen * 0.5 }]);
  const mouthWidth = useDerivedValue(() => frame.get().billOpen + 2);
  const mouthOpacity = useDerivedValue(() => Math.min(1, frame.get().billOpen));

  const leftLids = useDerivedValue(() => lidEdges(ART_GEOMETRY.leftEye, frame.get().upperLids, frame.get().lowerLids));
  const rightLids = useDerivedValue(() => lidEdges(ART_GEOMETRY.rightEye, frame.get().upperLids, frame.get().lowerLids));
  const leftLidCover = useDerivedValue(() => leftLids.get().cover);
  const leftLidLines = useDerivedValue(() => leftLids.get().lines);
  const rightLidCover = useDerivedValue(() => rightLids.get().cover);
  const rightLidLines = useDerivedValue(() => rightLids.get().lines);

  const uniforms = useDerivedValue(() => {
    const current = frame.get();
    const headShiftX = current.headYaw * PARALLAX.head;
    const headShiftY = current.headPitch * PARALLAX.head * PITCH_RATIO + current.headOffsetY + current.bustOffsetY;
    return {
      scale: viewScale,
      viewOrigin: [ART_VIEW.x, ART_VIEW.y],
      headCenter: [HEAD_VOLUME.x + headShiftX, HEAD_VOLUME.y + headShiftY],
      headRadius: [HEAD_VOLUME.radiusX, HEAD_VOLUME.radiusY],
      billCenter: [BILL_VOLUME.x + headShiftX, BILL_VOLUME.y + headShiftY],
      billRadius: [BILL_VOLUME.radiusX, BILL_VOLUME.radiusY],
      bodyCenter: [BODY_VOLUME.x, BODY_VOLUME.y + current.bustOffsetY],
      bodyRadius: [BODY_VOLUME.radiusX, BODY_VOLUME.radiusY],
      leftCheek: [LEFT_CHEEK.x + headShiftX, LEFT_CHEEK.y + headShiftY],
      rightCheek: [RIGHT_CHEEK.x + headShiftX, RIGHT_CHEEK.y + headShiftY],
      cheekRadius: CHEEK_RADIUS,
      turn: [current.headYaw, current.headPitch * PITCH_RATIO],
      light: [current.headYaw, current.headPitch],
      puff: current.cheekPuff,
      glow: current.glow,
      glowColor: [0.13, 0.9, 0.96],
      fade: [BUST_FADE.top, BUST_FADE.bottom],
    };
  });

  const haloOpacity = useDerivedValue(() => {
    const { warmth, glow, burrow, water } = frame.get();
    return (0.34 + warmth * 0.4 + glow * 0.3) * (1 - Math.max(burrow, water));
  });
  const haloColors = useDerivedValue(() =>
    frame.get().glow > 0.5 ? [palette.brand.glow, scene.cyanFade] : [palette.brand.primary, scene.orangeFade],
  );

  if (!images) return null;

  return (
    <Canvas style={{ width, height }}>
      <Group transform={rootTransform}>
        <Circle c={HALO_CENTER} r={HALO_RADIUS} opacity={haloOpacity}>
          <RadialGradient c={HALO_CENTER} r={HALO_RADIUS} colors={haloColors} />
        </Circle>
        <MascotSceneBack frame={frame} />
      </Group>
      <Group
        layer={
          <Paint>
            <RuntimeShader source={mascotVolumeShader} uniforms={uniforms} />
          </Paint>
        }
      >
        <Group transform={rootTransform}>
          <Group transform={bustTransform} origin={BUST_PIVOT}>
            <Group transform={bodyTransform}>
              <Layer name="body" image={images.body} />
            </Group>
            <Group transform={headTransform} origin={ART_GEOMETRY.neckPivot}>
              <Layer name="head" image={images.head} />
              <Group transform={tuftTransform} origin={ART_GEOMETRY.tuftPivot}>
                <Layer name="tuft" image={images.tuft} />
              </Group>
              <Group transform={eyesTransform}>
                <Group clip={leftEyeOpening}>
                  <Group transform={irisTransform}>
                    <Layer name="irisLeft" image={images.irisLeft} />
                  </Group>
                </Group>
                <Group clip={rightEyeOpening}>
                  <Group transform={irisTransform}>
                    <Layer name="irisRight" image={images.irisRight} />
                  </Group>
                </Group>
                <Group clip={leftLidCover}>
                  <Layer name="eyelidLeft" image={images.eyelidLeft} />
                </Group>
                <Group clip={rightLidCover}>
                  <Layer name="eyelidRight" image={images.eyelidRight} />
                </Group>
                <Group clip={leftLidLineArea}>
                  <Path path={leftLidLines} color={scene.eyelid} style="stroke" strokeWidth={5} strokeCap="round" />
                </Group>
                <Group clip={rightLidLineArea}>
                  <Path path={rightLidLines} color={scene.eyelid} style="stroke" strokeWidth={5} strokeCap="round" />
                </Group>
              </Group>
              <Group transform={leftBrowTransform} origin={browCenter("browLeft")}>
                <Layer name="browLeft" image={images.browLeft} />
              </Group>
              <Group transform={rightBrowTransform} origin={browCenter("browRight")}>
                <Layer name="browRight" image={images.browRight} />
              </Group>
              <Group transform={billTransform}>
                <Group transform={lowerBillTransform}>
                  <Layer name="billLower" image={images.billLower} />
                </Group>
                <Path path={mouthCrease} color={scene.mouth} style="stroke" strokeWidth={mouthWidth} opacity={mouthOpacity} transform={mouthTransform} strokeCap="round" />
                <Layer name="billUpper" image={images.billUpper} />
              </Group>
            </Group>
          </Group>
        </Group>
      </Group>
      <Group transform={rootTransform}>
        <MascotSceneFront frame={frame} />
      </Group>
    </Canvas>
  );
}
