import manifest from "../../../assets/mascot/layers/manifest.json";
import bodyLayer from "../../../assets/mascot/layers/body.png";
import headLayer from "../../../assets/mascot/layers/head.png";
import tuftLayer from "../../../assets/mascot/layers/tuft.png";
import browLeftLayer from "../../../assets/mascot/layers/browLeft.png";
import browRightLayer from "../../../assets/mascot/layers/browRight.png";
import irisLeftLayer from "../../../assets/mascot/layers/irisLeft.png";
import irisRightLayer from "../../../assets/mascot/layers/irisRight.png";
import billLowerLayer from "../../../assets/mascot/layers/billLower.png";
import billUpperLayer from "../../../assets/mascot/layers/billUpper.png";
import eyelidLeftLayer from "../../../assets/mascot/layers/eyelidLeft.png";
import eyelidRightLayer from "../../../assets/mascot/layers/eyelidRight.png";

/**
 * The mascot's layers, cut from the logo artwork by `tools/mascot-art/cut_layers.py`. Every
 * coordinate in the mascot code is in the artwork's own pixel space (the logo is 1254 wide).
 */
export type LayerName = keyof typeof manifest.layers;

export const LAYER_FRAMES = manifest.layers;
export const ART_GEOMETRY = manifest.geometry;

/** Metro asset ids of the layer images (a bundled image import is a number at run time). */
export const LAYER_SOURCES: Record<LayerName, number> = {
  body: bodyLayer as number,
  head: headLayer as number,
  tuft: tuftLayer as number,
  browLeft: browLeftLayer as number,
  browRight: browRightLayer as number,
  irisLeft: irisLeftLayer as number,
  irisRight: irisRightLayer as number,
  billLower: billLowerLayer as number,
  billUpper: billUpperLayer as number,
  eyelidLeft: eyelidLeftLayer as number,
  eyelidRight: eyelidRightLayer as number,
};

/** The part of the artwork the mascot view shows: the bust, with room above for the hop. */
export const ART_VIEW = { x: 227, y: 150, width: 800, height: 1000 } as const;

/** Width divided by height of the mascot view. */
export const MASCOT_ASPECT_RATIO = ART_VIEW.width / ART_VIEW.height;

/** The bust is cut off by the bottom of the logo; it fades out over these rows instead. */
export const BUST_FADE = { top: 1040, bottom: ART_VIEW.y + ART_VIEW.height } as const;

/** Pivots and volumes of the bust, read off the artwork. */
export const BUST_PIVOT = { x: 632, y: 1150 } as const;
export const HEAD_VOLUME = { x: 635, y: 590, radiusX: 350, radiusY: 335 } as const;
export const BILL_VOLUME = { x: 630, y: 748, radiusX: 205, radiusY: 118 } as const;
export const BODY_VOLUME = { x: 633, y: 1160, radiusX: 380, radiusY: 340 } as const;
export const LEFT_CHEEK = { x: 372, y: 748 } as const;
export const RIGHT_CHEEK = { x: 902, y: 738 } as const;
export const CHEEK_RADIUS = 120;
