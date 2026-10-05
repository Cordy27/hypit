# `@project/manim-showcase`

A project-local Author Package for a presenter-led portrait composition with three independent
Manim video cards. The package is an ordinary deterministic component: it adds no Provider,
Runtime Endpoint, generation request or Python execution to a Hypit Build.

The Surface accepts three opaque Manim MP4s, one Timeline and Canvas, plus four Script Moments. The
presenter is supplied separately by the production's standard Performance Track over that Timeline:

```svml
<manim:Scene id="showcase" timeline={program.timeline} canvas={canvas}
  math={math-source} ml={ml-source} physics={physics-source}
  first={story.moment.first} next={story.moment.next}
  finally={story.moment.finally} these={story.moment.these}
  during="program"/>
```

`first`, `next`, `finally` and `these` are semantic inputs projected to the production Timeline.
The renderer consumes their resolved `TemporalInstant` values and never parses Script text or
manufactures fixed cue times.

The project README owns the production-wide Manim boundary and handoff. This package only documents
its Surface, semantic inputs and the resulting VisualTrack; normalization, media inspection and
source provenance remain in the Author Graph and production README.

Build the package from this production directory:

```sh
npm run build --prefix packages/manim-showcase
```

The component follows the public `@hypit/hypit/*` Author Package interfaces and lowers to one
ordinary `VisualTrack` for the Film.

## Runtime and Studio

The production root supplies `hypit.runtime.json`, binding local media and HyperFrames providers
for the render Run. Install the project package from the production root with:

```sh
corepack pnpm install --frozen-lockfile
npm run build --prefix examples/manim-explainer/packages/manim-showcase
```

The package activation also registers a Studio Track Companion for the real `scene` Surface. It
identifies the coordinated Manim card overlay as one editable VisualTrack while leaving the presenter
Performance, three MP4 inputs and Python scene sources in their existing authoring boundaries.
Studio may adjust the owning Source after the package is rebuilt and the Studio process is restarted.
