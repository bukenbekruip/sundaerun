# Playable download

[Download Sundae Run ZIP](https://github.com/bukenbekruip/sundaerun/raw/refs/heads/main/downloads/Sundae-Run-Playable.zip), extract it, and open `OPEN-SUNDAE-RUN.html` in Chrome or Edge. If GitHub asks, sign in with an account that has access to this repository. From the ZIP's file page, the **Download raw file** button also downloads it.

This ZIP contains the HTML game, short opening instructions and the Inter font license. It embeds its code, fonts and images. It is the same build recorded in `qa/current/release.json`, with ZIP SHA-256 `7c787b8af0f3a98f0ea7f4dac9937e90460304d09dd8b4d28e1015ed74a6ae82`.

Portable browser checks passed with every extra network request blocked. Direct `file://` opening could not be exercised in the cloud's managed browser. The game uses fictional credits and concept artwork; no real merchant links or verified vehicle fitment are configured.

The build process writes generated output to ignored `dist/`. This directory holds the explicit download copy; after changing the game, rebuild, validate, and replace this ZIP together with the release hashes so it stays current.
