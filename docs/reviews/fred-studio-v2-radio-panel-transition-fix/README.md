# Fred Studio V2 radio panel transition continuity review

Date: 2026-08-07

Scope: close-transition title baseline continuity only. The approved world transform,
glass material, camera, lighting, audio controller, and close semantics are unchanged.

## Evidence sequence

The ten focused frames were captured at the fixed opening camera on the debug-only
`0.25×` close speed. The production route remains fixed at `1×`.

| Frame | Time | Observation |
| --- | ---: | --- |
| `frame-01-0ms.png` | 0 ms | Formal content begins its opacity exit. |
| `frame-02-100ms.png` | 100 ms | Compact proxy owns title, artist, and play icon. |
| `frame-03-250ms.png` | 250 ms | Proxy follows the frozen return transform. |
| `frame-04-450ms.png` | 450 ms | Title baseline remains fixed within the proxy. |
| `frame-05-650ms.png` | 650 ms | Compact hierarchy remains legible without reflow. |
| `frame-06-800ms.png` | 800 ms | Proxy continues toward the world target. |
| `frame-07-950ms.png` | 950 ms | Final approach remains baseline-stable. |
| `frame-08-1060ms.png` | 1060 ms | Proxy is at the frozen projected target. |
| `frame-09-1120ms.png` | 1120 ms | World compact surface takes ownership. |
| `frame-10-1200ms.png` | 1200 ms | Stable world compact end state. |

`transition-contact-sheet.png` presents the complete sequence in capture order.

## Verified close paths

- close button;
- outside click;
- Escape key;
- outside drag/camera movement followed by outside click;
- playing and paused states;
- normal `1×` and debug-only `0.25×` timing.

No browser runtime errors were observed. The existing Three.js shadow-map
deprecation warning remains unrelated to this transition.
