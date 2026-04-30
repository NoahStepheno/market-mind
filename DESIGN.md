---
name: Market
description: An Apple-inspired precision tool for intelligent stock alerts. Calm typography, parchment warmth, a single Action Blue accent, and UI chrome that recedes so the signal can speak.
colors:
  primary: "#0066cc"
  primary-focus: "#0071e3"
  primary-on-dark: "#2997ff"
  on-primary: "#ffffff"
  ink: "#1d1d1f"
  body-on-dark: "#ffffff"
  body-muted: "#cccccc"
  ink-muted-80: "#333333"
  ink-muted-48: "#7a7a7a"
  canvas: "#ffffff"
  parchment: "#f5f5f7"
  surface-pearl: "#fafafc"
  surface-tile-1: "#272729"
  surface-tile-2: "#2a2a2c"
  surface-tile-3: "#252527"
  surface-black: "#000000"
  chip-translucent: "#d2d2d7"
  divider-soft: "#f0f0f0"
  hairline: "#e0e0e0"
typography:
  hero-display:
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif"
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.07
    letterSpacing: "-0.28px"
  display-lg:
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif"
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0
  display-md:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1.47
    letterSpacing: "-0.374px"
  lead:
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: 0.196px
  tagline:
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif"
    fontSize: 21px
    fontWeight: 600
    lineHeight: 1.19
    letterSpacing: 0.231px
  body:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: "-0.374px"
  body-strong:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.24
    letterSpacing: "-0.374px"
  caption:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "-0.224px"
  fine-print:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: "-0.12px"
  button-primary:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: "-0.374px"
  button-utility:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.29
    letterSpacing: "-0.224px"
rounded:
  xs: 5px
  sm: 8px
  md: 11px
  lg: 18px
  pill: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 17px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-primary}"
    rounded: "{rounded.pill}"
    padding: "11px 22px"
  button-secondary-pill:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.button-primary}"
    rounded: "{rounded.pill}"
    padding: "11px 22px"
  button-dark-utility:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.body-on-dark}"
    typography: "{typography.button-utility}"
    rounded: "{rounded.sm}"
    padding: "8px 15px"
  button-pearl-capsule:
    backgroundColor: "{colors.surface-pearl}"
    textColor: "{colors.ink-muted-80}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  text-link-on-dark:
    backgroundColor: transparent
    textColor: "{colors.primary-on-dark}"
    typography: "{typography.body}"
  search-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: 44px
  utility-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "24px"
  footer:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-muted-80}"
    typography: "{typography.fine-print}"
    padding: "64px"
---

## 1. Overview

**Creative North Star: "The Calm Workshop"**

Market is a precision instrument disguised as an Apple product page. The design borrows Apple's reverence for whitespace, typographic discipline, and the single-accent grammar, then bends them toward a financial tool's seriousness. The result is neither a cold trading terminal nor a warm lifestyle app. It is a calm workshop: well-lit, organized, where every tool is exactly where you need it and nothing shouts for attention.

The surface palette alternates between parchment warmth (`#f5f5f7`) and near-black tiles (`#272729`), echoing Apple's tile-rhythm pattern but applied to information sections rather than product photography. Typography carries the weight: SF Pro Display headlines with negative letter-spacing create the signature "Apple tight" cadence, while body copy at 17px establishes a reading pace that says "think carefully" rather than "scan quickly." The single Action Blue accent (`#0066cc`) appears only on interactive elements, and its restraint is the point.

This system explicitly rejects the information overload of traditional broker apps (the dense grids, the red-green flashing tickers, the pop-up overlays of Tonghuashun and East Money). It also rejects the social noise of platforms like Xueqiu and Futu. Market's user comes here to act on signals, not to browse a feed.

**Key Characteristics:**

- One accent color (Action Blue `#0066cc`) carries every interactive element. No second brand color exists.
- Parchment (`#f5f5f7`) as the default canvas, not pure white. Warmth without decoration.
- SF Pro Display at 600 weight with negative letter-spacing for all display headlines. The "Apple tight" tracking is non-negotiable.
- Body copy at 17px, not 16px. The extra pixel sets a reading pace appropriate for financial decisions.
- Full-pill radius (`9999px`) reserved for primary actions. Radius grammar is strict: `sm` for utility, `lg` for cards, `pill` for actions.
- Zero shadows on UI chrome. Elevation comes from surface-color change, not drop-shadows.
- Chinese text for all product-facing copy. SF Pro is the display system; the body stack must render Chinese glyphs correctly via system fallbacks.

## 2. Colors

The palette is built on one saturated accent and a narrow band of near-black to near-white neutrals, all tinted slightly warm. There is no decorative color.

### Primary

- **Action Blue** (`#0066cc`): The single interactive color. Every text link, every primary CTA, every focus ring uses this. Its rarity makes it a signal: if you see blue, you can act on it. Press state uses `transform: scale(0.95)`, not a hex shift.
- **Focus Blue** (`#0071e3`): Marginally brighter, reserved for the `outline: 2px solid` keyboard focus ring on buttons.
- **Sky Link Blue** (`#2997ff`): Brighter variant for inline links on dark surfaces, where Action Blue would disappear against near-black tiles.

### Neutral

- **Parchment** (`#f5f5f7`): The signature canvas. Used as the default page background, alternating sections, and footer. Warm enough to feel considered, different enough from white to create rhythm.
- **Canvas** (`#ffffff`): Pure white for utility cards, configurator grids, and content areas that need maximum contrast against parchment.
- **Pearl** (`#fafafc`): Near-white fill for secondary "ghost" buttons. Lighter than parchment so the button reads as a button against parchment.
- **Near-Black Ink** (`#1d1d1f`): Every headline, every body paragraph. Chosen over pure black to keep surfaces feeling photographic rather than printed.
- **Ink Muted 80** (`#333333`): Body text on light surfaces where Ink is too heavy.
- **Ink Muted 48** (`#7a7a7a`): Disabled states and legal fine-print. The lightest text tone.
- **Body on Dark** (`#ffffff`): All text on dark tiles.
- **Body Muted** (`#cccccc`): Secondary copy on dark tiles where pure white would be too loud.

### Surface

- **Near-Black Tile 1** (`#272729`): Primary dark surface for alternating sections.
- **Near-Black Tile 2** (`#2a2a2c`): Micro-step lighter, for adjacent dark tiles needing faint separation.
- **Near-Black Tile 3** (`#252527`): Micro-step darker, for bottom-of-stack and embedded frames.
- **Surface Black** (`#000000`): True void. Reserved for global nav background only.
- **Translucent Chip Gray** (`#d2d2d7`): Base hex for circular control chips over photography. Applied at ~64% alpha in production.

### Borders & Dividers

- **Hairline** (`#e0e0e0`): 1px border on utility cards and chips.
- **Divider Soft** (`#f0f0f0`): Soft ring on secondary buttons. Functions as a shadow rather than a visible line.

**The One Accent Rule.** Action Blue is the only saturated color on any surface. Its presence signals interactivity. If a second accent color is introduced, the system loses its singular voice.

## 3. Typography

**Display Font:** SF Pro Display (`system-ui, -apple-system, sans-serif` fallback)
**Body Font:** SF Pro Text (`system-ui, -apple-system, sans-serif` fallback)
**Web Font (off-system):** Figtree Variable (closest open-source approximation to SF Pro for non-Apple platforms)

**Character:** Confident but quiet. Negative letter-spacing at display sizes produces the signature "Apple tight" cadence. Body at 17px with 1.47 line-height creates an editorial reading pace. Weight 300 is rare and deliberate, reserved for airy moments. Weight 500 is absent entirely.

### Hierarchy

| Token                         | Weight | Size | Line Height | Letter Spacing | Use                                          |
| ----------------------------- | ------ | ---- | ----------- | -------------- | -------------------------------------------- |
| `{typography.hero-display}`   | 600    | 56px | 1.07        | -0.28px        | Hero headline. The signature tight tracking. |
| `{typography.display-lg}`     | 600    | 40px | 1.10        | 0              | Section headlines atop every content tile.   |
| `{typography.display-md}`     | 600    | 34px | 1.47        | -0.374px       | Section sub-heads.                           |
| `{typography.lead}`           | 400    | 28px | 1.14        | 0.196px        | Tile sub-copy and feature descriptions.      |
| `{typography.tagline}`        | 600    | 21px | 1.19        | 0.231px        | Sub-section taglines.                        |
| `{typography.body-strong}`    | 600    | 17px | 1.24        | -0.374px       | Inline strong emphasis.                      |
| `{typography.body}`           | 400    | 17px | 1.47        | -0.374px       | Default paragraph. The brand's reading pace. |
| `{typography.caption}`        | 400    | 14px | 1.43        | -0.224px       | Secondary captions, utility labels.          |
| `{typography.fine-print}`     | 400    | 12px | 1.0         | -0.12px        | Legal text, footer copy, timestamps.         |
| `{typography.button-primary}` | 400    | 17px | 1.0         | -0.374px       | Primary CTA labels.                          |
| `{typography.button-utility}` | 400    | 14px | 1.29        | -0.224px       | Utility button labels, nav actions.          |

**The 17px Body Rule.** Body copy runs at 17px, not 16px. The extra pixel is deliberate: it sets a reading pace that says "consider this carefully," appropriate for financial information where scanning leads to mistakes. Never reduce to 16px.

**The No-500 Rule.** The weight ladder is 300 / 400 / 600. Weight 500 is forbidden. Mid-weight emphasis always uses 600.

## 4. Elevation

Market is flat by default. Elevation comes from surface-color change (light parchment alternating with near-black tiles), not from shadows or borders. The color change itself is the section divider.

### Shadow Vocabulary

- **Product Shadow** (`rgba(0, 0, 0, 0.22) 3px 5px 30px 0`): The single shadow in the entire system. Reserved exclusively for product imagery resting on a surface. Never applied to cards, buttons, or text.

### Alternative Elevation

- **Surface alternation:** Light tile and dark tile create visual separation without borders or shadows.
- **Backdrop blur:** `backdrop-filter: blur(N)` on sticky bars and overlays creates a "floating over content" effect that is functional, not decorative.
- **Soft hairline borders:** 1px `rgba(0, 0, 0, 0.08)` on utility cards when content boundaries need definition.

**The One Shadow Rule.** Shadows are reserved for product imagery only. If a shadow appears on a button, card, or text, it is a bug.

## 5. Components

### Buttons

Buttons follow two grammars: the primary pill CTA and the compact utility rect.

- **`button-primary`**: Background `{colors.primary}` (Action Blue), text `{colors.on-primary}`, pill radius (`9999px`), padding 11px x 22px. The pill shape IS the action signal. Active state: `transform: scale(0.95)`. Focus state: 2px solid `{colors.primary-focus}` outline.
- **`button-secondary-pill`**: Ghost variant. Transparent background, Action Blue text and 1px border, pill radius. Paired with `button-primary` when two CTAs appear together.
- **`button-dark-utility`**: Background `{colors.ink}`, text `{colors.body-on-dark}`, radius `{rounded.sm}` (8px), padding 8px x 15px. Used for compact nav and utility actions.
- **`button-pearl-capsule`**: Background `{colors.surface-pearl}`, text `{colors.ink-muted-80}`, radius `{rounded.md}` (11px). Secondary action on light surfaces.

### Cards & Containers

- **`utility-card`**: Background `{colors.canvas}`, 1px solid `{colors.hairline}` border, radius `{rounded.lg}` (18px), padding `{spacing.lg}` (24px). Content: product image, name in `{typography.body-strong}`, price in `{typography.body}`, action link. No shadow.
- **Full-bleed tiles**: Alternating light (parchment or canvas) and dark (near-black) sections with zero corner radius, zero gap between them. The color change is the divider. Vertical padding 80px.

### Inputs & Fields

- **`search-input`**: Background `{colors.canvas}`, pill radius (`9999px`), height 44px, padding 12px x 20px. Leading search icon at 14px. Same pill grammar as the primary CTA.

### Navigation

- **Global nav**: Background `{colors.surface-black}`, height 44px, text `{colors.body-on-dark}` in `{typography.fine-print}` (12px). Collapses to hamburger at 834px.
- **Sub-nav frosted**: Background `{colors.parchment}` at 80% opacity with backdrop-filter blur, height 52px. Category name in `{typography.tagline}`, inline links in `{typography.button-utility}`.

### Footer

- **`footer`**: Background `{colors.parchment}`, text `{colors.ink-muted-80}`, vertical padding 64px. Link columns with relaxed 2.41 line-height for scannability. Legal row in `{typography.fine-print}`.

### Signature Component: Alarm Card

The alarm card is Market's core interactive unit. It displays a user's stock alert in a compact, scannable format: stock name, condition summary, status indicator, and quick-edit affordance. The card uses the `utility-card` chassis but introduces a left-edge status accent via background tint (not a side-stripe border, which is prohibited). Active alarms carry a subtle green tint; triggered alarms carry a warm amber tint; paused alarms are muted.

## 6. Do's and Don'ts

### Do

- **Do** use Action Blue (`#0066cc`) for every interactive element: links, primary CTAs, focus rings. The single accent is non-negotiable.
- **Do** set headlines in SF Pro Display 600 with negative letter-spacing (`-0.28px` to `-0.374px`) for the "Apple tight" cadence.
- **Do** run body copy at 17px / 400 / 1.47 line-height. The reading pace is part of the brand.
- **Do** use Parchment (`#f5f5f7`) as the default canvas. It is warmer and more considered than pure white.
- **Do** apply `transform: scale(0.95)` as the press state on every button. It is the system-wide micro-interaction.
- **Do** keep the global nav pure black (`#000000`). It anchors the page.
- **Do** use full-pill radius (`9999px`) for primary actions. The pill shape is the action grammar.
- **Do** write all product-facing text in Chinese.

### Don't

- **Don't** introduce a second accent color. If you feel the need for a second color, the design has lost restraint. Revisit the layout instead.
- **Don't** add shadows to cards, buttons, or text. The single shadow is reserved for product imagery, period.
- **Don't** use decorative gradients. Depth comes from surface-color alternation and backdrop blur, not CSS gradients.
- **Don't** set body copy at weight 500. The ladder is 300 / 400 / 600. No exceptions.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards, list items, or callouts. Use background tints instead.
- **Don't** use `background-clip: text` with gradient backgrounds. Text color is always a single solid.
- **Don't** create same-sized card grids with icon + heading + text repeated endlessly. Vary the layout.
- **Don't** let the interface resemble traditional broker apps (dense grids, flashing tickers, pop-up overlays). Market rejects the information overload of Tonghuashun and East Money.
- **Don't** introduce social features, comment threads, or leaderboards. Market is not Xueqiu or Futu. The user comes here to act on signals, not to browse a feed.
- **Don't** use Sky Link Blue (`#2997ff`) on light surfaces. It is the dark-tile-only variant of Action Blue.
