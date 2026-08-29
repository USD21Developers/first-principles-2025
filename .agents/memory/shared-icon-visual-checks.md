---
name: Shared icon visual checks
description: Why shared control icons need pixel-level validation in addition to DOM and accessibility assertions.
---

For shared controls, verify the rendered icon at its actual display size rather than relying only on the presence of an SVG element and accessible labels.

**Why:** A structurally valid compound SVG can render as a filled disk when its fill semantics do not create the intended interior detail. Automated DOM assertions may still pass even though users see an unrecognizable dot.

**How to apply:** Include screenshot review for icon changes, checking shape, contrast, and internal detail on representative desktop and mobile backgrounds. Prefer explicit stroke/fill behavior over inherited defaults.