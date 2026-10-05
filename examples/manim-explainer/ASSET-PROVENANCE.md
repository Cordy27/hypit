# Asset provenance

This production keeps the accepted presenter performance, its native narration and the three
independent Manim renders as separate inputs. The active Run selects only the files documented
below; earlier experiments remain in the project for comparison and are not active dependencies.

## Presenter and narration

- Presenter video: `assets/edits/english-seedance-person-full.mp4`
- Seedance voice reference sample: `assets/edits/alex.wav`
- Generation authoring: `authors/main.svml` (the single active Author Graph)
- Presenter direction: `authors/direction.svml`
- The accepted performance is an adult male speaking the authored English Script. Seedance uses the
  five-second sample for voice identity and generates the performance audio inside each video.

## Manim inputs

The following files are separate external renders produced from the project-local Python scenes.
They are declared directly as Author assets and must be re-rendered manually after their Python
sources or render settings change:

| Active file | Authoring source | Role |
| --- | --- | --- |
| `manim-renders/math_block.mp4` | `manim-scenes/math_block.py` | Axes, growing parabola and moving tangent |
| `manim-renders/ml_block.mp4` | `manim-scenes/ml_block.py` | Three-layer network, signal propagation and falling loss curve |
| `manim-renders/physics_block.mp4` | `manim-scenes/physics_block.py` | Pendulum, force and velocity vectors with trail |

Each active Manim input is an opaque H.264 `yuv420p` MP4 at 1280x720. The scene code owns the
internal mathematical animation. Before import, the files are probed and normalized onto the shared
Timeline clock; the Hypit component samples and presents them and does not rely on an alpha channel.

## Rebuild boundary

Generated Manim MP4s are reproducible intermediates and are not committed. The canonical
`runs/render.svrun` has no machine-local Build records; a fresh checkout generates the presenter and
downstream outputs from the current Author Graph after the three scenes are rendered.
