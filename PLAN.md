# Wingdev Splash Page — Development Plan

## Context
Wingdev needs a public-facing landing page at **wingdev.ai** with download links for the desktop app (Electron) and iOS app. Target audience is friends for now — light marketing, polished feel. The page should carry over the app's signature dark aesthetic and LiquidEther fluid effect.

## Approach
Single `index.html` + inline CSS + one bundled JS file for the fluid effect. Zero build step — just static files deployed via Vercel and pointed at wingdev.ai.

## Structure

```
wingdev-site/
├── index.html          # Single page, all markup + inline styles
├── liquid-ether.js     # Standalone Three.js + fluid sim bundle (self-contained)
├── assets/
│   ├── logo.png        # Copied from main app
│   ├── icon.png        # App icon
│   └── og-image.png    # Social share preview (1200x630)
└── CNAME               # Custom domain: wingdev.ai
```

## Page Sections (top to bottom)

### 1. Hero (full viewport)
- **LiquidEther** as full-screen background (same colors: `#0a0a0c, #141428, #1e1b4b, #312e81`)
- Logo centered
- Tagline: **"Mission control for your coding projects"**
- Two download buttons side by side:
  - **Download for Mac** (links to GitHub release or direct .dmg URL)
  - **Download for iOS** (links to App Store or TestFlight)
- Subtle scroll indicator at bottom

### 2. Brief feature highlights (~3 items)
- Icon + one-liner each:
  - "Track every service, API, and credential across all your projects"
  - "Auto-syncs with Claude Code as you build"
  - "See deploy health, git activity, and dependency status at a glance"
- Dark cards on the same dark background, minimal

### 3. Footer
- "Built by JP" or similar
- Link to GitHub repo (if public) or contact

## Design Specs

| Element | Value |
|---------|-------|
| Background | `#09090b` |
| Accent | `#6366f1` (indigo) |
| Accent hover | `#818cf8` |
| Text primary | `#fafafa` |
| Text secondary | `#a1a1aa` |
| Font | Quantico (Google Fonts, 400 + 700) |
| Button style | Solid accent bg, white text, subtle hover glow |
| Border radius | 0 (matching app's sharp edge aesthetic) |

## LiquidEther Integration

The main app has the full implementation at `src/components/LiquidEther.tsx` in the wingdev repo (`~/Development/wingdev`). Port it as a standalone JS file:

1. Bundle Three.js (tree-shaken) + fluid simulation class + all 7 GLSL shaders into a single `liquid-ether.js` IIFE using esbuild
2. Expose a simple init function: `LiquidEther.init(canvasElement, options)`
3. Config to match the app header: resolution 0.3, BFECC off, autoDemo on, mouseForce 15, cursorSize 200
4. Canvas is `position: fixed` behind all content, full viewport

Build command: `npx esbuild src/liquid-ether.js --bundle --minify --outfile=liquid-ether.js`

### Shaders to include (all from LiquidEther.tsx):
- advection_frag — traces velocity field backwards
- color_frag — maps velocity magnitude to palette color
- divergence_frag — calculates pressure requirements
- externalForce_frag — applies mouse/touch impulse
- poisson_frag — iterative pressure solver
- pressure_frag — subtracts pressure gradient
- viscous_frag — diffusion/viscosity

### Render loop per frame:
1. Advect velocity → 2. Apply force → 3. Compute divergence → 4. Solve pressure (32 iterations) → 5. Subtract gradient → 6. Color output

## Domain Setup (wingdev.ai via GoDaddy → Vercel)

1. Create GitHub repo `wingdev-site`, push static files
2. Connect repo to Vercel (import project)
3. In Vercel dashboard: Settings → Domains → add `wingdev.ai`
4. In GoDaddy DNS:
   - A record `@` → `76.76.21.21`
   - CNAME `www` → `cname.vercel-dns.com`
5. Vercel handles SSL automatically

## Verification
1. Open `index.html` locally in browser — fluid effect runs, buttons visible, responsive on mobile
2. Test on phone-width viewport — buttons stack vertically, text readable
3. Verify download links work (placeholder URLs until actual releases are ready)
4. Deploy to Vercel, confirm wingdev.ai resolves correctly
