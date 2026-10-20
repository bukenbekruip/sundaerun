# Conversation transfer — project chronology

> This document is a **faithful detailed summary**, not a verbatim transcript or transferred ChatGPT session.

## Overall goal

Sundae Run is a premium, fun car-culture community brand. The user wants a charming, very high-quality browser workshop game eventually integrated into their site. Multiple cars and management features have been discussed, but the **current scope is exactly one desktop STI customisation page**, modelled on the user's approved premium game-reference screen.

## Early phase: visuals and first prototypes

- User requested cosy/smooth game look where players can change tyres/wheels/paint, employ staff and expand lifts. Cars need to look convincingly realistic; no placeholder SVG sprites.
- Early image-based prototypes were built with separate shell and wheels. The shell images were 2D white car bodies and separately generated wheels. Result: too-large car, small circles that didn't match perspective, poor layers, cars off platform.
- Multiple attempts at 3D used procedural low-poly custom rendering that was broken or visually crude. The user explicitly rejected it and asked for correct technology and proper assets.
- Suggested tools evolved from Blender/Three.js/Node/Vite to Godot, eventually to a **fixed-camera 2.5D** scene using PixiJS/Vite/GSAP to preserve exact approved still-art quality.

## User tool installation

- User confirmed Node `v24.22.0` and npm; Windows PATH was initially broken. Once temporary PATH set, verified `gsap@3.15.0`, `pixi.js@8.22.0`, `vite@8.3.4` in `sundae-run-dev`.
- First STI Pixi starter ran locally in Chrome. User screenshot showed overscaled car and missing wheels. Next visual fix showed white STI and rims, but wheels too small/wrong angle, platform/branding weak.

## Approved look

- User supplied two strong visual inspirations: 1) management game with Sundae Run wall signs, branded lifts, staff/upgrades cards; 2) premium Porsche mint customisation screen, full car and platform, bottom menu.
- Generated a blue STI counterpart: `reference/APPROVED_BLUE_STI_SCREEN.png`, including bright branded workshop, bronze wheels, turntable, HUD and bottom wheels/paint controls. User confirmed **'It's right like you have it'** and requested the **exact screen** to become interactive.
- Detailed specification fixed 1672×941 coordinate system, artwork, menus, dynamic pricing and browser QA gates.

## Interactive V1 and V2

- V1 displayed the screenshot in a webpage with interactive transparent buttons and image overlays, so opening state could match reference, but wheel and paint changes were physically inaccurate.
- User said rims didn't fit, check didn't move to selected black, paint showed floating image.
- V2 tried face-only wheel masking, selection indicators and rough paint masks; issues persisted. Screenshots of V2 alternate states are in `qa/`. User asked, 'why do you give it to me when you know its not right?'
- Assistant acknowledged that error and committed to **asset-first reconstruction** and self-QA before next build.

## Codex request

- User first asked to 'ship this to codex' then requested this chat to be transferred. No direct chat-transfer action was available. User requested detailed transfer information plus a file they can give Codex. This package includes current editable V2 source, all necessary reference imagery, QA screenshots, core instructions, layout specification and summary of decisions.

## Non-goals at this stage

- Do not build the Porsche, Toyota 86, jobs, money economy beyond one checkout flow, staff, site homepage, multiplayer, free camera, or full garage tycoon.
- Do not rebuild into ugly low-poly/abstract art; do not claim flattened image provides true functional customisation.
