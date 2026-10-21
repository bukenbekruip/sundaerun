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
     'import {STAGE,CAR_TRANSFORMS,variants,upgradeVariants} from "./src/scene.js";'
     'console.log(JSON.stringify({STAGE,CAR_TRANSFORMS,variants,upgradeVariants}));'],
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
    'registrationNote': 'Each vehicle uses one uniform transform for its body and wheels. Toyota and BMW have single whole-car vertical offsets; Golf uses a uniform 0.54 scale and whole-car placement to fit its taller roof while retaining platform contact. Minor illustration/reflection differences remain between wheel variants; metadata auditing does not replace visual review.',
    'assets': assets,
}
target = ROOT / 'public/assets/cars/manifest.json'
target.write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Recorded {len(assets)} image checksums and native geometry in {target.relative_to(ROOT)}; no image pixels changed.')

# Generated originals are intentionally not project dependencies. These stable
# provenance identifiers come from the inspected art-production records; when
# originals are retained locally, also verify that publication was a byte copy.
UPGRADE_ORIGINALS = {
    'sti:body:street': 'exec-ae93d109-2256-48e4-b8e8-b93b7df3e154.png',
    'sti:body:track': 'exec-2a02ecde-21bd-420c-94e1-751a5a422a82.png',
    'sti:tyre:sport': 'exec-bc1fdb88-40d4-48d6-9c52-78f38b6e6cb1.png',
    'sti:tyre:track': 'exec-5dc1787c-901e-4e3f-bee1-dedb8a49cb9e.png',
    'porsche:body:street': 'exec-2c6e2803-c87a-4702-969f-f2cb6344ae31.png',
    'porsche:body:track': 'exec-1181001f-351c-4406-81a9-3c44bc50535d.png',
    'porsche:tyre:sport': 'exec-d761e70a-8d91-44de-8225-2af9296dade3.png',
    'porsche:tyre:track': 'exec-d4f4724d-3c8b-4d4f-a899-420131815eab.png',
    'gt86:body:street': 'exec-665fd352-3557-46f9-9e2b-13cb56e05b3b.png',
    'gt86:body:track': 'exec-f6cd0e0e-0d28-4ac4-b2e8-5507686d74c8.png',
    'gt86:tyre:sport': 'exec-1a52b462-0957-40bf-b156-45c05df25f3e.png',
    'gt86:tyre:track': 'exec-bb239627-3acb-4c49-abb5-af24f431e376.png',
}
expansion_source_path = ROOT / 'public/assets/expansion-sources.json'
expansion_sources = json.loads(expansion_source_path.read_text()) if expansion_source_path.exists() else {}
for key, entry in expansion_sources.items():
    if ':tyre:' in key or ':body:' in key:
        UPGRADE_ORIGINALS[key] = entry['sourceGeneratedOriginal']

upgrades = {}
for key, variant in registry['upgradeVariants'].items():
    if not variant['ready']:
        continue
    vehicle, family, _choice = key.split(':')
    path = ROOT / 'public' / variant['src']
    data = path.read_bytes()
    original_name = UPGRADE_ORIGINALS[key]
    original_path = ROOT.parent / 'generated_images' / original_name
    if original_path.exists():
        assert original_path.read_bytes() == data, f'Not a source byte copy: {key}'
    with Image.open(path) as artwork:
        assert artwork.mode == 'RGBA', f'Transparent RGBA required: {path}'
        alpha = artwork.getchannel('A')
        histogram = alpha.histogram()
        total = artwork.width * artwork.height
        opaque_count = sum(histogram[128:])
        upgrades[key] = {
            'src': variant['src'],
            'width': artwork.width,
            'height': artwork.height,
            'mode': artwork.mode,
            'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest(),
            'opaqueBoundsAlpha128': alpha.point(
                lambda value: 255 if value >= 128 else 0,
            ).getbbox(),
            'alphaStatistics': {
                'transparentPixels': histogram[0],
                'opaquePixelsAlpha128': opaque_count,
                'totalPixels': total,
            },
            'rendering': (
                'fullcar_source_clipped_to_rubber' if family == 'tyre'
                else 'sparse_registered_additive_carbon_layer'
            ),
            'sourceCar': registry['variants'][f'{vehicle}:sr-01']['src'],
            'sourceGeneratedOriginal': original_name,
            'generationMethod': (
                'image_gen registered full-car rubber-material edit; runtime '
                'draws only authored rubber annuli and preserves the active '
                'rim, painted body and original silhouette alpha.'
                if family == 'tyre' else
                'image_gen sparse, camera-registered additive carbon parts; '
                'no original car, painted bumper, glass, wheel or wing layer.'
            ),
        }

upgrade_manifest = {
    'provenance': (
        'Twenty image_gen concept upgrade assets, published as unchanged byte '
        'copies of the recorded generated originals. Original handover '
        'references and complete-car renders remain unchanged.'
    ),
    'logicalCanvas': registry['STAGE'],
    'vehicleTransforms': registry['CAR_TRANSFORMS'],
    'registrationNote': (
        'Upgrade images retain the same full canvas, camera and contact '
        'coordinates as their vehicle source. Native width may vary by up to '
        'two pixels; the compositor registers the whole canvas uniformly. '
        'Never subject-fit a tyre pair or draw a full-car tyre source unmasked.'
    ),
    'suspensionMethod': (
        'Suspension uses authored wheel/ground separation and translates the '
        'complete rigid body and attached kit by a calibrated integer offset. '
        'It does not resize wheels, tyres or painted body geometry.'
    ),
    'validationScope': (
        'Checksums, decoded alpha and camera metadata can detect missing, '
        'changed, flattened or recentered assets. Visual browser review is '
        'also required for trim attachment, rubber masking and suspension '
        'occlusion. These are concept previews, not verified physical fitment '
        'or tyre-performance simulations.'
    ),
    'assets': upgrades,
}
upgrade_target = ROOT / 'public/assets/upgrades/manifest.json'
upgrade_target.write_text(json.dumps(upgrade_manifest, indent=2) + '\n')
print(f'Recorded {len(upgrades)} upgrade checksums, alpha and provenance in {upgrade_target.relative_to(ROOT)}; no image pixels changed.')
