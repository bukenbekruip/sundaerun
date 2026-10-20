#!/usr/bin/env python3
"""Record image metadata/checksums only; visual acceptance remains a separate gate.

Requires Pillow. This script never writes or alters an image.
"""
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
registry = json.loads(subprocess.check_output(
    ['node', '--input-type=module', '-e',
     'import {STAGE,CAR_TRANSFORMS,variants} from "./src/scene.js";'
     'console.log(JSON.stringify({STAGE,CAR_TRANSFORMS,variants}));'],
    cwd=ROOT, text=True,
))
assets = {}
for key, variant in registry['variants'].items():
    if not variant['ready']:
        continue
    path = ROOT / 'public' / variant['src']
    data = path.read_bytes()
    with Image.open(path) as artwork:
        assert artwork.mode == 'RGBA', f'Transparent RGBA required: {path}'
        bounds = artwork.getchannel('A').point(lambda alpha: 255 if alpha >= 128 else 0).getbbox()
        assets[key] = {
            'src': variant['src'],
            'width': artwork.width,
            'height': artwork.height,
            'mode': artwork.mode,
            'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest(),
            'opaqueBoundsAlpha128': bounds,
        }
manifest = {
    'provenance': 'Complete transparent concept-car artwork generated with image_gen using the approved STI camera and per-car base references. Wheel variants are whole-car edits, never independent wheel overlays. Original handover images are preserved.',
    'logicalCanvas': registry['STAGE'],
    'vehicleTransforms': registry['CAR_TRANSFORMS'],
    'paintMethod': 'Runtime material transfer within authored per-vehicle panel masks, with protected glass, lamps, trim and complete wheel assemblies. Colour previews and wheel names do not establish real-world product fitment.',
    'registrationNote': 'Each vehicle uses one uniform transform for its body and wheels. Toyota has a single whole-car vertical offset to align its tyre contact with the platform. Minor illustration/reflection differences remain between wheel variants; metadata auditing does not replace visual review.',
    'assets': assets,
}
target = ROOT / 'public/assets/cars/manifest.json'
target.write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Recorded {len(assets)} image checksums and native geometry in {target.relative_to(ROOT)}; no image pixels changed.')
