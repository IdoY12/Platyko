# Mascot art pipeline

`cut_layers.py` cuts the logo platypus (`mobile/assets/splash-icon.png`) into the transparent
layers the animated mascot draws (`mobile/assets/mascot/layers/`) and writes `manifest.json`
with each layer's position and the geometry the rig needs (PRD 13.2, decision D5).

Run it again only when the logo artwork changes:

```sh
python3 -m venv .venv && .venv/bin/pip install -r tools/mascot-art/requirements.txt
.venv/bin/python tools/mascot-art/cut_layers.py
```

The first run downloads the background-removal model (about 1 GB) into `~/.rembg`.

The script also writes `recomposition.json` beside itself: the colour difference (0 to 255 per
channel) between the layers recomposed at rest and the logo character. That file is the evidence
for the acceptance criterion "at rest the mascot is pixel-identical to the logo artwork". The few
pixels that differ sit on the one-pixel soft edges where two layers meet. Debug images (masks,
the recomposed character, a closed-eyes preview) go to `tools/mascot-art/debug/`, which is not
committed.

Landmarks (the bill outline, the mouth crease, the eye and brow boxes, the tuft and the neck)
are hand-placed constants at the top of the script, in the logo's own 1254-pixel space.
