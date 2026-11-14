"""Cuts the logo platypus (mobile/assets/splash-icon.png) into the layers the animated mascot uses.

The mascot must be identical to the logo at rest (PRD 13.2, decision D5), so every layer is made of
the logo's own pixels. The script removes the background, separates the moving parts, fills in what
each part hides, generates fur-textured eyelids, and writes a manifest with every layer's position
and the geometry the animation rig needs. Run it again whenever the logo artwork changes:

    python tools/mascot-art/cut_layers.py

All coordinates below are in the logo's own 1254 x 1254 pixel space.
"""

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
LOGO_PATH = REPOSITORY_ROOT / "mobile/assets/splash-icon.png"
OUTPUT_DIRECTORY = REPOSITORY_ROOT / "mobile/assets/mascot/layers"
DEBUG_DIRECTORY = Path(__file__).resolve().parent / "debug"
REPORT_PATH = Path(__file__).resolve().parent / "recomposition.json"

# Hand-placed landmarks, read off the artwork.
BILL_OUTLINE = [
    (438, 728), (455, 702), (490, 690), (530, 676), (560, 656), (592, 643), (630, 638), (670, 643), (705, 660),
    (740, 678), (780, 690), (810, 700), (824, 716), (826, 742), (815, 772), (790, 802), (750, 830), (700, 849),
    (640, 859), (590, 857), (540, 846), (500, 826), (470, 801), (448, 771), (436, 748),
]
MOUTH_CREASE = [(440, 720), (452, 742), (480, 775), (520, 798), (570, 810), (620, 814), (670, 808), (720, 795), (765, 772), (802, 730), (815, 705)]
LEFT_EYE_BOX = (420, 540, 560, 700)
RIGHT_EYE_BOX = (680, 520, 830, 685)
LEFT_BROW_BOX = (424, 440, 530, 545)
RIGHT_BROW_BOX = (680, 415, 825, 500)
TUFT_POLYGON = [(520, 352), (528, 300), (545, 280), (560, 300), (600, 250), (668, 222), (680, 262), (708, 268), (690, 320), (700, 352)]
TUFT_BLEND_TOP, TUFT_BLEND_BOTTOM = 334, 356
TUFT_PIVOT = (612, 346)
NECK_LEFT, NECK_RIGHT = 418, 892
HEAD_BLEND_TOP, HEAD_BLEND_BOTTOM = 848, 892
BODY_BLEND_TOP, BODY_BLEND_BOTTOM = 830, 850
SHOULDER_TOP = 880
NECK_PIVOT = (655, 860)
FOREHEAD_FUR = (560, 425, 700, 565)


def remove_background(logo: Image.Image) -> np.ndarray:
    """Returns the character as RGBA with a soft fur edge; the navy background and halo are gone."""
    cut_out = remove(logo, session=new_session("birefnet-general"))
    return np.array(cut_out.convert("RGBA"))


def box_mask(shape, box) -> np.ndarray:
    mask = np.zeros(shape[:2], np.uint8)
    left, top, right, bottom = box
    mask[top:bottom, left:right] = 255
    return mask


def largest_component(mask: np.ndarray) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if count <= 1:
        return mask
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return np.where(labels == biggest, 255, 0).astype(np.uint8)


def feather(mask: np.ndarray, radius: int) -> np.ndarray:
    return cv2.GaussianBlur(mask, (0, 0), radius) if radius > 0 else mask


def find_bill(rgb: np.ndarray) -> np.ndarray:
    """Snaps the hand-placed bill outline to the real colour edge with GrabCut."""
    outline = np.zeros(rgb.shape[:2], np.uint8)
    cv2.fillPoly(outline, [np.array(BILL_OUTLINE, np.int32)], 255)
    labels = np.full(rgb.shape[:2], cv2.GC_BGD, np.uint8)
    labels[cv2.dilate(outline, np.ones((41, 41), np.uint8)) > 0] = cv2.GC_PR_BGD
    labels[outline > 0] = cv2.GC_PR_FGD
    labels[cv2.erode(outline, np.ones((45, 45), np.uint8)) > 0] = cv2.GC_FGD
    cv2.grabCut(rgb, labels, None, np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64), 6, cv2.GC_INIT_WITH_MASK)
    bill = np.where((labels == cv2.GC_FGD) | (labels == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    bill = cv2.morphologyEx(largest_component(bill), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    return cv2.medianBlur(bill, 9)


def below_curve(shape, curve) -> np.ndarray:
    """Everything under a left-to-right polyline."""
    height, width = shape[:2]
    polygon = np.array(curve + [(curve[-1][0], height), (curve[0][0], height)], np.int32)
    mask = np.zeros((height, width), np.uint8)
    cv2.fillPoly(mask, [polygon], 255)
    return mask


def find_eye(rgb: np.ndarray, box) -> tuple[np.ndarray, np.ndarray]:
    """Returns the eye opening (white, iris and outline) and the iris disc inside it."""
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    white = cv2.inRange(hsv, (0, 0, 150), (179, 75, 255))
    dark = cv2.inRange(hsv, (0, 0, 0), (179, 255, 62))
    seed = cv2.bitwise_and(cv2.bitwise_or(white, dark), box_mask(rgb.shape, box))
    seed = largest_component(cv2.morphologyEx(seed, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)))
    hull = cv2.convexHull(np.argwhere(seed > 0)[:, ::-1].astype(np.int32))
    opening = np.zeros(rgb.shape[:2], np.uint8)
    cv2.fillConvexPoly(opening, hull, 255)

    inside = cv2.erode(opening, np.ones((7, 7), np.uint8))
    not_white = cv2.bitwise_and(cv2.bitwise_not(white), inside)
    iris_blob = largest_component(cv2.morphologyEx(not_white, cv2.MORPH_OPEN, np.ones((15, 15), np.uint8)))
    (center_x, center_y), radius = cv2.minEnclosingCircle(np.argwhere(iris_blob > 0)[:, ::-1].astype(np.float32))
    iris = np.zeros(rgb.shape[:2], np.uint8)
    cv2.circle(iris, (round(center_x), round(center_y)), round(radius), 255, cv2.FILLED)
    return opening, cv2.bitwise_and(iris, opening)


def find_brow(rgb: np.ndarray, box) -> np.ndarray:
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    dark_brown = cv2.inRange(hsv, (0, 0, 0), (40, 255, 104))
    brow = cv2.morphologyEx(cv2.bitwise_and(dark_brown, box_mask(rgb.shape, box)), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    brow = cv2.morphologyEx(largest_component(brow), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    return cv2.dilate(brow, np.ones((5, 5), np.uint8))


def fill_hidden(rgb: np.ndarray, mask: np.ndarray, grow: int, radius: int) -> np.ndarray:
    """Paints over `mask` from its surroundings, so nothing shows when the part above it moves."""
    grown = cv2.dilate(mask, np.ones((grow, grow), np.uint8))
    return cv2.inpaint(rgb, grown, radius, cv2.INPAINT_TELEA)


def fur_strands(rgb: np.ndarray, box) -> np.ndarray:
    """The fine detail of a fur patch (the patch minus its own blur), tiled over the whole image."""
    left, top, right, bottom = box
    patch = rgb[top:bottom, left:right].astype(np.float32)
    strands = patch - cv2.GaussianBlur(patch, (0, 0), 5)
    tiles = (rgb.shape[0] // strands.shape[0] + 1, rgb.shape[1] // strands.shape[1] + 1, 1)
    return np.tile(strands, tiles)[: rgb.shape[0], : rgb.shape[1]]


def vertical_ramp(shape, top: int, bottom: int, rising: bool) -> np.ndarray:
    """A 0..1 mask that changes linearly between two rows."""
    rows = np.arange(shape[0], dtype=np.float32)
    ramp = np.clip((rows - top) / max(1, bottom - top), 0, 1)
    ramp = ramp if rising else 1 - ramp
    return np.repeat(ramp[:, None], shape[1], axis=1)


def save_layer(name: str, rgb: np.ndarray, alpha: np.ndarray, manifest: dict) -> None:
    """Writes one layer trimmed to its visible box and records where it sits."""
    alpha_bytes = np.clip(alpha, 0, 255).astype(np.uint8)
    points = cv2.findNonZero(np.where(alpha_bytes > 2, 255, 0).astype(np.uint8))
    left, top, width, height = cv2.boundingRect(points)
    rgba = np.dstack([rgb, alpha_bytes])[top : top + height, left : left + width]
    Image.fromarray(rgba, "RGBA").save(OUTPUT_DIRECTORY / f"{name}.png", optimize=True)
    manifest["layers"][name] = {"x": left, "y": top, "width": width, "height": height}


def composite(layers: list[tuple[np.ndarray, np.ndarray]], shape) -> np.ndarray:
    """Draws layers back to front with ordinary alpha blending, as the app does at rest."""
    canvas = np.zeros((shape[0], shape[1], 4), np.float32)
    for rgb, alpha in layers:
        source_alpha = (alpha.astype(np.float32) / 255)[..., None]
        canvas[..., :3] = rgb.astype(np.float32) * source_alpha + canvas[..., :3] * (1 - source_alpha)
        canvas[..., 3:] = source_alpha * 255 + canvas[..., 3:] * (1 - source_alpha)
    return canvas


def main() -> None:
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    DEBUG_DIRECTORY.mkdir(parents=True, exist_ok=True)
    character = remove_background(Image.open(LOGO_PATH).convert("RGB"))
    rgb, alpha = character[..., :3].copy(), character[..., 3].copy()
    shape = rgb.shape
    alpha_unit = alpha.astype(np.float32) / 255

    bill = find_bill(rgb)
    lower_bill = cv2.bitwise_and(bill, below_curve(shape, MOUTH_CREASE))
    left_eye, left_iris = find_eye(rgb, LEFT_EYE_BOX)
    right_eye, right_iris = find_eye(rgb, RIGHT_EYE_BOX)
    left_brow, right_brow = find_brow(rgb, LEFT_BROW_BOX), find_brow(rgb, RIGHT_BROW_BOX)

    tuft_region = np.zeros(shape[:2], np.uint8)
    cv2.fillPoly(tuft_region, [np.array(TUFT_POLYGON, np.int32)], 255)
    tuft_alpha = alpha_unit * (tuft_region / 255) * vertical_ramp(shape, TUFT_BLEND_TOP, TUFT_BLEND_BOTTOM, rising=False)

    # The head keeps the eye whites; everything that moves on top of it is painted out underneath.
    head_rgb = fill_hidden(rgb, bill, grow=9, radius=9)
    head_rgb = fill_hidden(head_rgb, cv2.bitwise_or(left_brow, right_brow), grow=9, radius=7)
    for iris in (left_iris, right_iris):
        eye_white = np.median(rgb[(cv2.bitwise_or(left_eye, right_eye) > 0) & (cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[..., 1] < 60)], axis=0)
        head_rgb[iris > 0] = eye_white
    head_shape = np.ones(shape[:2], np.float32)
    columns = np.arange(shape[1])
    neck_columns = (columns >= NECK_LEFT) & (columns <= NECK_RIGHT)
    head_shape[:, neck_columns] = vertical_ramp(shape, HEAD_BLEND_TOP, HEAD_BLEND_BOTTOM, rising=False)[:, neck_columns]
    head_shape[SHOULDER_TOP:, ~neck_columns] = 0
    tuft_cut = (tuft_region / 255) * vertical_ramp(shape, TUFT_BLEND_TOP - 4, TUFT_BLEND_TOP, rising=False)
    head_alpha = alpha_unit * cv2.GaussianBlur(head_shape, (0, 0), 5) * (1 - tuft_cut)

    body_shape = np.zeros(shape[:2], np.float32)
    body_shape[:, neck_columns] = vertical_ramp(shape, BODY_BLEND_TOP, BODY_BLEND_BOTTOM, rising=True)[:, neck_columns]
    body_shape[SHOULDER_TOP:, ~neck_columns] = 1
    body_alpha = alpha_unit * body_shape

    # Eyelids: each eye opening is painted over from the fur around it, which gives every part of
    # the lid its local colour (brown above, cream by the cheek); real strands from the forehead
    # are then added back so the lid is not smoother than the fur beside it.
    lid_base = fill_hidden(rgb, cv2.bitwise_or(left_eye, right_eye), grow=13, radius=9).astype(np.float32)
    lid_rgb = np.clip(lid_base + fur_strands(rgb, FOREHEAD_FUR), 0, 255).astype(np.uint8)

    manifest: dict = {"canvas": {"width": shape[1], "height": shape[0]}, "layers": {}}
    upper_bill = cv2.bitwise_and(bill, cv2.bitwise_not(lower_bill))
    layer_alphas = {
        "body": body_alpha * 255,
        "head": head_alpha * 255,
        "tuft": tuft_alpha * 255,
        "browLeft": feather(left_brow, 1).astype(np.float32),
        "browRight": feather(right_brow, 1).astype(np.float32),
        "irisLeft": feather(left_iris, 1).astype(np.float32),
        "irisRight": feather(right_iris, 1).astype(np.float32),
        "billLower": feather(lower_bill, 1).astype(np.float32),
        "billUpper": feather(upper_bill, 1).astype(np.float32),
        "eyelidLeft": feather(cv2.dilate(left_eye, np.ones((9, 9), np.uint8)), 2).astype(np.float32),
        "eyelidRight": feather(cv2.dilate(right_eye, np.ones((9, 9), np.uint8)), 2).astype(np.float32),
    }
    layer_colors = {name: rgb for name in layer_alphas}
    layer_colors["head"] = head_rgb
    layer_colors["eyelidLeft"] = layer_colors["eyelidRight"] = lid_rgb
    for name, layer_alpha in layer_alphas.items():
        save_layer(name, layer_colors[name], layer_alpha, manifest)

    def eye_geometry(opening, iris):
        left, top, width, height = cv2.boundingRect(cv2.findNonZero(opening))
        (center_x, center_y), radius = cv2.minEnclosingCircle(cv2.findNonZero(iris).reshape(-1, 2).astype(np.float32))
        return {"x": left, "y": top, "width": width, "height": height, "irisX": round(center_x), "irisY": round(center_y), "irisRadius": round(radius)}

    bill_left, bill_top, bill_width, bill_height = cv2.boundingRect(cv2.findNonZero(bill))
    manifest["geometry"] = {
        "neckPivot": {"x": NECK_PIVOT[0], "y": NECK_PIVOT[1]},
        "tuftPivot": {"x": TUFT_PIVOT[0], "y": TUFT_PIVOT[1]},
        "leftEye": eye_geometry(left_eye, left_iris),
        "rightEye": eye_geometry(right_eye, right_iris),
        "bill": {"x": bill_left, "y": bill_top, "width": bill_width, "height": bill_height},
        "mouthCrease": [{"x": x, "y": y} for x, y in MOUTH_CREASE],
    }
    (OUTPUT_DIRECTORY / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    # Proof for the acceptance criterion: the resting layers, drawn back to front, give the logo character.
    resting_order = ["body", "head", "tuft", "browLeft", "browRight", "irisLeft", "irisRight", "billLower", "billUpper"]
    rebuilt = composite([(layer_colors[name], layer_alphas[name]) for name in resting_order], shape)
    visible = alpha > 250
    colour_error = np.abs(rebuilt[..., :3] - rgb.astype(np.float32))[visible].max(axis=1)
    report = {
        "pixelsCompared": int(visible.sum()),
        "meanColourError": round(float(colour_error.mean()), 3),
        "percentOfPixelsWithinTwoLevels": round(float((colour_error <= 2).mean() * 100), 2),
        "percentOfPixelsWithinEightLevels": round(float((colour_error <= 8).mean() * 100), 2),
        "maxColourError": round(float(colour_error.max()), 1),
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n")
    Image.fromarray(np.clip(rebuilt, 0, 255).astype(np.uint8), "RGBA").save(DEBUG_DIRECTORY / "recomposed.png")
    closed = composite([(layer_colors[name], layer_alphas[name]) for name in resting_order + ["eyelidLeft", "eyelidRight"]], shape)
    Image.fromarray(np.clip(closed, 0, 255).astype(np.uint8), "RGBA").save(DEBUG_DIRECTORY / "eyes-closed.png")
    overlay = rgb.copy()
    for mask, colour in ((upper_bill, (0, 255, 0)), (lower_bill, (0, 120, 255)), (left_eye, (255, 0, 255)), (right_eye, (255, 0, 255)), (left_iris, (255, 255, 0)), (right_iris, (255, 255, 0)), (left_brow, (0, 255, 255)), (right_brow, (0, 255, 255)), (tuft_region, (255, 80, 80))):
        outline, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(overlay, outline, -1, colour, 2)
    Image.fromarray(overlay).save(DEBUG_DIRECTORY / "masks.png")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
