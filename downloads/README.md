# Playable download

[Download Sundae Run ZIP](https://github.com/bukenbekruip/sundaerun/raw/refs/heads/main/downloads/Sundae-Run-Playable.zip), extract it, and open `OPEN-SUNDAE-RUN.html` in Chrome or Edge. If GitHub asks, sign in with an account that has access to this repository. From the ZIP’s file page, the **Download raw file** button also downloads it.

This upgrade edition contains the HTML game, opening instructions and the Inter font license (about 54 MB compressed). Choose the STI, Porsche 911 GT3 RS or Toyota 86, six wheel concepts and twelve paint colours, plus road/semi-slick/slick tyres, original/sport/track suspension and original/street/track carbon packages. Each car keeps its own fitted parts, with a shared fictional credit balance. Older saves migrate automatically.

The game embeds its code, fonts and images. It is the exact build recorded in `qa/upgrades/release.json`, with ZIP SHA-256 `6809b71e02b3baad0ff656444bf64e74a72004b215cf722468e726e1460a5755`.

The portable checks exercise the baseline paint set and representative upgraded builds with every extra network request blocked. Exact coverage and results are recorded in `qa/upgrades/portable-results.json`. Direct `file://` opening could not be exercised in the cloud’s managed browser. The game uses fictional credits and concept artwork; no real merchant links or verified vehicle fitment are configured.

The build process writes generated output to ignored `dist/`. This directory holds the explicit download copy; after changing the game, rebuild, validate, and replace this ZIP together with its release hashes so it stays current.
