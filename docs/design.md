# Design

The visual rules for Nouri and why each one was chosen. Tokens live in `src/app/globals.css`; change them there, not in components.

## What the app is for

People log meals several times a day, often one-handed, often while eating. Every screen should answer one question in a glance: how am I doing today, what did I eat, what is this food worth. Numbers are the content, so they get the clearest type and the most space. Decoration gets none.

## Colour

| Token | Light | Dark | Why |
| --- | --- | --- | --- |
| `paper` | `#f6f3ec` | `#171614` | Warm off-white reads like a notebook page and is softer than pure white at breakfast and late at night. |
| `surface` | `#fffdf8` | `#201e1b` | One step lighter than paper for the nav bar and, later, cards. |
| `ink` | `#23211e` | `#ede8df` | Warm charcoal instead of black, matching the paper. |
| `ink-muted` | `#67625a` | `#a39d92` | Secondary text. At least 5:1 contrast on paper in both themes. |
| `line` | `#e2dccf` | `#34312c` | Hairline borders only. |
| `accent` | `#4b6646` | `#9cb894` | Muted green. Used for the active tab now, and later for the one primary action per screen and progress toward a target. Nowhere else. |
| `protein`, `carbs`, `fat` | terracotta, ochre, slate | lighter versions | One colour per macro so a bar or ring can be read without its label. Kept earthy so they sit with the paper instead of shouting. |

Theme follows the device setting (`prefers-color-scheme`). There is no in-app toggle yet.

## Type

- **Instrument Sans** for everything people read and tap. Clear at small sizes, and it ships tabular figures, so `1111` and `8888` take the same width and nutrition columns line up. The body sets `font-variant-numeric: tabular-nums` globally.
- **Newsreader** for screen titles only. A serif title gives the app a calm, editorial voice, so it doesn't look like a fitness dashboard. Never used for numbers or controls.

Both are bundled by `next/font` at build time, so the native app works offline.

## Shape and space

- One radius for cards (`--radius-card`, 10 px). Controls get their own radius when they exist; no pill-shaped everything.
- Borders, not shadows. Shadows are reserved for something that truly floats above the page (a sheet or dialog).
- 16 px side gutter, content column capped at 448 px, so a phone held in landscape or a tablet doesn't stretch lines across the screen.

## Navigation

Five tabs fixed to the bottom: Home, Diary, Discover, Progress, Profile. Labels are always visible (icons alone are guesswork). Each tab is at least 56 px tall. The bar pads itself with `env(safe-area-inset-bottom)` so it clears the iPhone home indicator and Android gesture bar, and `viewport-fit=cover` lets the paper colour run behind the status bar.

Icons are Lucide at 1.6 stroke, 2.1 when active. They are used only in the nav, where a picture helps people find a tab faster.

## Motion

Colour transitions of 150 ms on interactive elements, nothing else. Nothing loops or bounces.

## Honesty rules for screens

- No sample numbers on real screens. A section that isn't wired to data shows what it will contain and says "Not built yet".
- Empty states say why they are empty and what to do next.
- Estimated foods are labelled as estimates wherever their numbers appear.
