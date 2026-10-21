# Playable download

[Download Sundae Run ZIP](https://github.com/bukenbekruip/sundaerun/raw/refs/heads/main/downloads/Sundae-Run-Playable.zip), extract it, and open `OPEN-SUNDAE-RUN.html` in Chrome or Edge. If GitHub asks, sign in with an account that has access to this repository. From the ZIP file page, **Download raw file** also downloads it.

This first **Build Club** milestone adds named saved builds, six one-time credit/XP briefs per car, filters/intakes, exhausts and tunes, PNG show cards and shareable/importable build codes. Open **BUILD CLUB** in the garage header. The STI, Porsche 911 GT3 RS and Toyota 86 retain all six rims, twelve paints and existing tyre, suspension and carbon choices. Earlier credits and purchases are retained. Friends importing a code receive a free exterior preview, not ownership or rewards.

The BMW M3 E46, VW Golf Mk7 GTI, interiors, live retailer offers, online profiles and website connection are still pending. Performance ratings are game values. Shopping-region preferences do not imply that retailer listings have been configured.

The ZIP contains the exact tested portable HTML, opening instructions and Inter font license (about 54 MB compressed). Current hashes and exact coverage are in `qa/club/release.json`. ZIP SHA-256: `f087ecd46c53c713bc5e455222e4484b04a58251286931e5ae787c32790e0bd1`.

The portable Club checks block every additional network request. Direct `file://` opening remains untested under the managed browser policy. Previous full exterior matrix evidence is retained under `qa/upgrades/`; that historical run is not a claim that this milestone reran every appearance. Exterior assets and both rendering modules are unchanged.

`npm run build:standalone` writes ignored `dist/`. After passing production and portable Club checks, `python3 scripts/package-playable.py` updates this explicit download copy and release hashes.
