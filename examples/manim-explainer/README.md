# Hypit x Manim showcase

An editable portrait production showing an English Seedance presenter with three independent,
opaque Manim MP4 tracks. The five normalized Seedance Takes form one continuous presenter Timeline
shown through the standard Performance Track. The Manim Python scenes own their internal animation;
the project component owns only the three cards' sampling, layout, scale, opacity, brightness and stacking.

Read [Brief](BRIEF.md) for the commissioned goal, [Treatment](TREATMENT.md) for the intended
viewing experience, [Craft Notes](CRAFT-NOTES.md) for the directing decisions and [Asset Provenance](ASSET-PROVENANCE.md) for the active media boundary.

## Start here

From the Hypit repository root:

```sh
corepack pnpm install --frozen-lockfile
PATH_TO_HYPIT="$(pwd)/bin/hypit.mjs"
node "$PATH_TO_HYPIT" auth login vectrust.seedance --runtime examples/manim-explainer/hypit.runtime.json
uv sync --frozen --project examples/manim-explainer
uv run --frozen --project examples/manim-explainer manim render --config_file examples/manim-explainer/manim.cfg --format mp4 --fps 30 --resolution 1280,720 --output_file math_block examples/manim-explainer/manim-scenes/math_block.py MathBlock
uv run --frozen --project examples/manim-explainer manim render --config_file examples/manim-explainer/manim.cfg --format mp4 --fps 30 --resolution 1280,720 --output_file ml_block examples/manim-explainer/manim-scenes/ml_block.py MLBlock
uv run --frozen --project examples/manim-explainer manim render --config_file examples/manim-explainer/manim.cfg --format mp4 --fps 30 --resolution 1280,720 --output_file physics_block examples/manim-explainer/manim-scenes/physics_block.py PhysicsBlock
npm run build --prefix examples/manim-explainer/packages/manim-showcase
node "$PATH_TO_HYPIT" check examples/manim-explainer/runs/render.svrun --workspace examples/manim-explainer
node "$PATH_TO_HYPIT" plan examples/manim-explainer/runs/render.svrun --workspace examples/manim-explainer --runtime examples/manim-explainer/hypit.runtime.json
node "$PATH_TO_HYPIT" studio --run examples/manim-explainer/runs/render.svrun --workspace examples/manim-explainer --runtime examples/manim-explainer/hypit.runtime.json
```

`runs/render.svrun` is the canonical complete-production entry: it targets `final.video` and builds
the presenter, normalization, speech alignment, project component, Film and final rendering from
the current Author Graph. It contains no machine-local Build records, so a fresh checkout follows
the same path as an ordinary Run. Root pnpm installation supplies the repository's Hypit workspace
package to the example component; do not run a separate npm install in this production. The three
Manim renders are reproducible ignored intermediates. A Build also regenerates the five Seedance
presenter clips and requires configured third-party Provider credentials and accepted spending scope.

## Canonical production shape

The active production follows the complex-production example at the same authoring granularity:

```text
BRIEF.md / TREATMENT.md / ASSET-PROVENANCE.md / CRAFT-NOTES.md
authors/  assets.svml  script.svml  direction.svml  main.svml
recipes/  composition.svs  performance.svs
runs/     generate.svrun  render.svrun
manim-scenes/  three independent Manim scene sources
packages/    project-local Hypit component
manim-renders/     accepted external Manim intermediates
```

Only `manim-renders/math_block.mp4`, `manim-renders/ml_block.mp4` and `manim-renders/physics_block.mp4` are active
Manim inputs. Generated renders, QA captures, exported videos, runtime state and historical drafts
are intentionally omitted from this repository template.

## Where an edit belongs

| Edit | Owner |
| --- | --- |
| Spoken words and paragraph boundaries | `authors/script.svml` |
| Presenter direction and pronunciation | `authors/direction.svml`, `recipes/performance.svs` |
| Seedance generation requests | `authors/main.svml`, `runs/generate.svrun` |
| Input media, clock and canvas | `authors/assets.svml` |
| Timeline, media normalization, component, audio and Film | `authors/main.svml` |
| Card appearance defaults | `recipes/composition.svs` |
| Coordinated card motion and cue timing | `packages/manim-showcase/src/render.ts` |
| Accepted output selection for an iteration | the current Author Graph and `runs/render.svrun` |
| Manim scene content | `manim-scenes/math_block.py`, `manim-scenes/ml_block.py`, `manim-scenes/physics_block.py` |

## Components

`@project/manim-showcase` owns the coordinated card scene. It accepts three opaque Manim videos, the
Canvas and four Script Moments. The presenter remains the assembled Timeline's Performance
contribution. The component's public boundary is deliberately small: card sampling, placement,
scale, opacity, brightness, stacking and canvas containment. The Python scenes remain independent
external authoring sources, and the Film/audio wiring remains in `authors/main.svml`.

The package registers a Studio Companion for the same `scene` Surface and VisualTrack output. The
Companion supplies a recognizable timeline lane and display title; it does not create a second
rendering path or expose internal HTML and Manim implementation details as author fields.

## External Manim handoff

Render each scene using the commands in [Start here](#start-here), then probe and visually inspect
the files independently before importing them.

The active files are `manim-renders/math_block.mp4`, `manim-renders/ml_block.mp4` and
`manim-renders/physics_block.mp4`. They are separate H.264 `yuv420p` inputs without alpha and are
ignored generated intermediates. Probe and visually inspect each render before import; the Author
Graph normalizes them onto the shared Timeline clock. The HTML component samples and places them;
it does not generate their internal motion.

The project-local `vectrust.seedance` Endpoint uses the verified Seedance-compatible API at
`https://draw.openai-next.com` and maps Hypit's `seedance-2-mini` requests to the service's
`doubao-seedance-2-0-260128` model. Store the supplied API key with the command above; it is held by
the selected credential store and is not written to this production.

## Build

```sh
npm run build --prefix examples/manim-explainer/packages/manim-showcase
```

The current production canvas is 720x1280 and its shared Timeline is 30 fps. The component uses the
Timeline frame rate as its sampling timebase rather than requiring 30 fps as a package contract. The
presenter remains full-frame throughout; at `First`, `Next` and `Finally`, the corresponding card
is focused, enlarged and brightened while the other two remain smaller and dimmed. At `These`, all
three return to the small overview arrangement and continue to loop. The native Seedance English
voice is the only narration.
