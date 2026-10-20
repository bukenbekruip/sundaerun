# Playable download

[Download Sundae Run ZIP](https://github.com/bukenbekruip/sundaerun/raw/refs/heads/main/downloads/Sundae-Run-Playable.zip), extract it, and open `OPEN-SUNDAE-RUN.html` in Chrome or Edge. If GitHub asks, sign in with an account that has access to this repository. From the ZIP's file page, the **Download raw file** button also downloads it.

This three-car edition contains the HTML game, short opening instructions and the Inter font license (about 43 MB compressed). Choose the STI, Porsche 911 GT3 RS or Toyota 86, all six wheel concepts and twelve paint colours. Each car keeps its own fitted build and owned parts, with a shared fictional credit balance.

The game embeds its code, fonts and images. It is the same build recorded in `qa/expanded/release.json`, with ZIP SHA-256 `873bb03baca24505898391f480614f7370327346dc11de380bda60653cf3fe0a`.

All 216 appearances passed portable browser checks with every extra network request blocked. Direct `file://` opening could not be exercised in the cloud's managed browser. The game uses fictional credits and concept artwork; no real merchant links or verified vehicle fitment are configured.

The build process writes generated output to ignored `dist/`. This directory holds the explicit download copy; after changing the game, rebuild, validate, and replace this ZIP together with the release hashes so it stays current.
