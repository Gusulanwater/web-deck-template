# Architecture notes

This deck is plain static HTML/CSS/JS (no framework, no build step). The design choices:

- **Data-driven slides** — each page is an object in `slides.js`; the engine renders by `type`.
- **Step reveals** — elements use `data-s`; the engine adds `active` and `st0…stN` / `.on`, and CSS owns the motion.
- **Three roles** — audience (default), speaker (`?presenter=1`), and preview (`?preview=1`).
- **Two-window sync** — `postMessage`, with `BroadcastChannel` as fallback, so either window can advance or black out and the other follows.
- **Inline text marks** — `[[accent]]`, `{{muted}}`, `((silver))`.
- **Speaker notes** — `notes.js`, with optional spans across slides; edits can live in `localStorage` and be exported.
- **Annotations** — per step, stored in `localStorage`.
- **Fixed stage** — 1920×1080 scaled to the window.

All code and demo content in this repository were written for this project.
