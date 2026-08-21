# Performance Gate — Creative UI

- Current production build: successful after the creative UI slice.
- New Home route chunk: approximately 13.34 kB minified / 5.59 kB gzip.
- New ArticleSlides route chunk: approximately 23.15 kB minified / 8.29 kB gzip.
- Existing application still reports large chunks: main application around 929 kB minified / 325 kB gzip, LiveKit around 665 kB / 180 kB gzip, PDF worker around 1.3 MB.
- Decision: do not add GSAP, Lenis, Three.js, Vanta, Matter.js, or shader runtime in this slice. Native scroll, IntersectionObserver, CSS and bounded Canvas 2D provide the requested visual foundation with lower marginal cost.
- Entry criteria for a future experiment: a route-specific narrative that cannot be expressed in DOM/CSS, a static poster fallback, a mobile performance budget, and a before/after measurement.
