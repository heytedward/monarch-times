# Monarch Times - Design System & Aesthetic Guide

This document defines the visual language of **Monarch Times**. The aesthetic is a modern, brutalist interpretation of the **De Stijl** art movement (notably Piet Mondrian), fused with a "terminal/cyberpunk" ethos.

## 1. Core Principles

1.  **High Contrast:** Black and white are the dominant carriers of structure.
2.  **Geometric Precision:** Everything is a rectangle. No rounded corners (border-radius: 0).
3.  **Thick Borders:** Borders are not just dividers; they are structural beams.
4.  **Primary Colors:** Color is used functionally to denote "Topics" or "Rarity", never for decoration.
5.  **Raw Typography:** Fonts are chosen for mechanical readability and impact.

## 2. Typography

We use a pairing of a heavy display font and a monospace functional font.

### Display Font
*   **Name:** `Archivo Black`
*   **Usage:** Headers, Logos, Impact text.
*   **Characteristics:** Heavy weight, uppercase, tight letter spacing (`-2px`).
*   **Fallback:** sans-serif.

### Functional Font
*   **Name:** `Space Mono`
*   **Usage:** Body text, metadata, UI elements, button labels.
*   **Characteristics:** Monospace, technical, high readability.
*   **Weights:** 400 (Regular), 700 (Bold).

```css
/* Global assignment */
h1 {
  font-family: 'Archivo Black', sans-serif;
  text-transform: uppercase;
  letter-spacing: -2px;
}

body {
  font-family: 'Space Mono', monospace;
}
```

## 3. The "De Stijl" Grid & Borders

The site feels "constructed" rather than "painted" due to its border usage.

### Borders
*   **Standard Border:** `4px solid #000000` (or `4px solid #FFFFFF` in dark mode).
*   **Heavy Border:** `6px solid #000000` (used for `.destijl-border` class).
*   **Radius:** `0px` (Strictly square).

### Layout
*   **CSS Grid:** The layout relies heavily on CSS Grid with `dense` flow to create the "masonry" look of a Mondrian painting.
*   **Gaps:** Small, consistent gaps (e.g., `gap-1`) let the background color peek through, creating "lines" between content.

## 4. Color Palette

Colors are strictly assigned to **Topics** (Context) or **Rarity** (Value).

### Neutral Foundation
| Name | Hex | Usage |
| :--- | :--- | :--- |
| **Void Black** | `#000000` | Text, Borders, Dark Mode Background |
| **Paper White** | `#FFFFFF` | Card Backgrounds, Light Mode Text |
| **Off White** | `#F0F0F0` | Light Mode Background (Canvas) |
| **Dark Gray** | `#1A1A1A` | Dark Mode Background (Canvas) |

### Topic Colors (De Stijl Derived)
These colors define the "Identity" of content.

| Topic | Hex | CSS Variable |
| :--- | :--- | :--- |
| **Fashion** | `#FF0000` | `--color-fashion` (Red) |
| **Music** | `#0052FF` | `--color-music` (Blue) |
| **Philosophy** | `#FFD700` | `--color-philosophy` (Yellow) |
| **Art** | `#FF6B00` | `--color-art` (Orange) |
| **Gaming** | `#9945FF` | `--color-gaming` (Purple) |

*Note: In dark mode, these colors are slightly muted/shifted for better contrast against black.*

## 5. Visual Effects

### The "Living" Grid
The grid is not static; it breathes.
*   **Push Animation:** New items physically push existing items down.
*   **Burning:** Old items (about to be deleted) fade and desaturate.
*   **Shimmer:** Hero items have a subtle traversing light effect.

### Holographic Cards (Rarity)
We use CSS `mix-blend-mode` and gradients to simulate foil trading cards.
*   **Chrysalis (Rank 2):** Rainbow shimmer.
*   **Emergence (Rank 3):** Diagonal color shift.
*   **Papillon (Rank 4):** Iridescent wings effect.
*   **Monarch (Rank 5):** Full gold/orange holographic shine.

```css
/* Example Holographic Shine */
.card__shine {
  mix-blend-mode: color-dodge;
  background: repeating-linear-gradient(135deg, ...rainbow...);
}
```

## 6. UI Components

### Buttons
*   **Shape:** Rectangular.
*   **Style:** `border-4 border-black` (or white).
*   **Hover:** Invert colors (Black bg/White text -> White bg/Black text).
*   **Text:** Uppercase, Bold, Monospace.

### Badges / Tags
*   **Style:** Solid background blocks.
*   **Text:** Tiny, Uppercase, Monospace.
*   **Spacing:** Tight padding (`px-2 py-0.5`).

## 7. Dark Mode Strategy
*   **Inversion:** Black borders become white. White backgrounds become black.
*   **Topic Consistency:** Topic colors remain largely the same but are checked for contrast.
*   **Ambient Light:** A subtle "breathing grid" background is added in dark mode using opacity animations on 1px lines.

---

**Summary for Developers:**
To replicate the "Monarch Look":
1.  **Drop the border-radius.**
2.  **Thicken the borders (4px+).**
3.  **Use `Space Mono` for everything except headers.**
4.  **Use `Archivo Black` for headers.**
5.  **Stick to the 5 primary topic colors.**
6.  **Embrace high contrast.**
