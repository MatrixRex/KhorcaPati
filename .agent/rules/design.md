# KhorcaPati Design System & Rules

This document defines the "Premium Emerald Glassmorphism" aesthetic for the KhorcaPati project. These rules should be followed by all agents and developers to maintain visual consistency.

## 1. Core Visual Direction
- **Theme**: Modern Glassmorphism.
- **Accents**: Dark Emerald with Sage-tinted backgrounds.
- **Vibe**: Clean, premium, high-contrast typography, and depth through blurs and glows.

## 2. Color System (OKLCH)
We use `oklch` for all primary colors to ensure perceptual uniformity.
- **Primary**: `oklch(26.398% 0.04514 178.226)` (Dark Emerald).
- **Background**: Soft Sage Tinted Base `oklch(0.98 0.005 160)`.
- **Surface**: Glass backgrounds with variable opacity.
- **Rules**: 
    - Favor `text-gradient` for headings.
    - Never use generic Tailwind colors (e.g., `bg-blue-500`) for primary UI elements.

## 3. Glassmorphism Primitives
- **Blur**: `32px` (`backdrop-blur-sm` to `backdrop-blur-xl`).
- **Edge Highlight**: Always pair glass backgrounds with `border: 1px solid var(--glass-border)` and an inner glow: `box-shadow: inset 0 1px 0 0 var(--glass-inner-glow)`.
- **Utilities**: 
    - `.glass-card`: Main interactive containers.
    - `.setting-item-glass`: List items and rows.

## 4. Typography Patterns
- **Fonts**: 
    - Headings: `Outfit` (fallback to sans-serif).
    - Body: `Inter`.
- **Styling**: 
    - Metadata/Captions: `.label-caption` + `font-black uppercase tracking-widest`.
    - Main Headings: `.label-header` (semibold, tight tracking).
    - Numerical Values: `.text-value-lg` (bold, tight).

## 5. Interaction & Feedback
- **Micro-interactions**: EVERY interactive element (button, card, row) MUST have `active:scale-95 transition-all duration-200`.
- **Glows**: Use the `.card-glow` utility for categorical feedback.
- **Animations**: 
    - `animate-reveal`: Entrance for new items.
    - `animate-float`: Subtle movement for background elements.

## 6. Component Rules
- **Buttons**: Use `.btn-premium`, `.btn-secondary-premium`, or `.btn-destructive-premium`.
- **Progress Bars**: Use `.premium-progress` with `--progress-indicator` for themed glows.
- **Rounding**: Base is `rounded-xl` (`--radius: 0.75rem`). Sections use `rounded-3xl`.
- **Stacking**: Use `.stacked-card-effect` for visual depth on "total" or "summary" sections.
