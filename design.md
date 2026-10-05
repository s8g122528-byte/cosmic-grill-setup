# Kennedy Moon Grill — Design Theme

The site has **two visual worlds** that share one soul: fire, charcoal, and gold.

---

## 1. Storefront (customer side) — "Charcoal & Cream BBQ"

A warm, playful, flame-grilled personality. Cream paper background, charcoal ink,
flame-red and ember-orange accents, gold highlights.

### Colors

| Token | Value | Use |
|---|---|---|
| `cream` | oklch(0.947 0.041 87.5) | Page background — warm paper |
| `cream-deep` | oklch(0.906 0.056 84) | Secondary surface |
| `flame` | oklch(0.585 0.238 27.5) | Primary accent — CTAs, highlights |
| `flame-dark` | oklch(0.47 0.2 27.5) | Pressed/hover accent |
| `ember` | oklch(0.75 0.18 62) | Warm orange glow |
| `gold` | oklch(0.85 0.15 88) | Luxury highlights, stars, badges |
| `charcoal` | oklch(0.28 0.03 40) | Text, dark surfaces |

### Typography

| Font | Role |
|---|---|
| **Anton** | Hero headlines — tall, bold, poster-style |
| **Baloo 2** | Display/headings — rounded, friendly |
| **Mouse Memoirs** | Poster/handwritten accents (menu book, labels) |
| **Nunito** | Body text — soft, readable |

### Shadows
- `shadow-card` / `shadow-card-hover` — soft charcoal drop shadows
- `shadow-pill` — flame-tinted glow under pill buttons

### Motion
Framer Motion micro-interactions: cards rise and fade in on scroll
(`y:40 → 0`, slight scale, springy ease `[0.34, 1.3, 0.64, 1]`),
hover lifts, staggered reveals.

---

## 2. Consoles (owner / rider / auth) — "Obsidian & Champagne"

A dark, luxurious control-room feel. Roasted-espresso surfaces, champagne-gold
accents, frosted-glass panels.

### Colors

| Token | Value | Use |
|---|---|---|
| `ink` / `ink-deep` | oklch(0.185 / 0.132) | Page background gradient |
| `panel` / `panel-soft` | oklch(0.238 / 0.284) | Card surfaces |
| `line` | oklch(0.372) | Borders |
| `frost` / `mist` / `slate-dim` | light neutrals | Text hierarchy |
| `lux` / `lux-deep` | oklch(0.858 / 0.702, gold) | Primary accent — buttons, highlights |
| `jade` | green | Success / available states |
| `azure` | warm blue | Info states |
| `ruby` | red | Danger / cancel |
| `violet-lux`, `amber-lux` | purple, amber | Category accents |

### Signature utilities
- **`console-shell`** — layered radial glows (gold, ruby, azure) over a dark gradient
- **`panel-lux`** — frosted-glass panel: gold-tinted border, blurred background, deep shadow
- **`panel-3d` / `panel-3d-hover`** — raised "hyper 3D" surface with inset gold glow,
  lifts 4px on hover
- **`gold-text`** — shimmering champagne gradient text

### Loading screen
Dark obsidian backdrop, unfolding heading (rotateX), gold count-up percentage
in the right corner (no progress bar), curtain-parting reveal into the home page.

---

## Design rules
- All colors are **oklch** tokens in `src/styles.css` — never hardcode hex.
- Radius base: `0.625rem`, scaling up to `4xl`.
- Dark consoles and light storefront are intentional opposites joined by gold/flame.
