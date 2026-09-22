---
name: Jev Decision Studio
description: A calm, precise workbench for inspecting typed decisions and recorded evidence.
colors:
  ink: "#202124"
  muted: "#62666e"
  line: "#e3e4e7"
  surface: "#fff"
  warm-white: "#fafaf9"
  subtle: "#f6f7f8"
  accent: "#2859d8"
  blue-soft: "#edf2ff"
  success: "#207347"
  warning: "#885c15"
  field-border: "#ced1d8"
typography:
  headline:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-.035em"
  title:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "-.015em"
  body:
    fontFamily: "Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  hint:
    fontSize: ".82rem"
    lineHeight: 1.6
  label:
    fontSize: ".84rem"
    fontWeight: 600
  tag:
    fontSize: ".72rem"
    fontWeight: 500
rounded:
  tag: "5px"
  control: "6px"
  panel-detail: "7px"
spacing:
  compact: "6px"
  small: "8px"
  medium: "12px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    width: "100%"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  textarea:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel-detail}"
    padding: "12px 13px"
    width: "100%"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 30px 10px 11px"
    width: "100%"
  tag:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.tag}"
    padding: "3px 7px"
---

# Design System: Jev Decision Studio

## Overview

**Creative North Star: "Decision Studio"**

A calm decision workbench uses warm white, pale neutral panels, near-black type, thin borders, and a blue action accent. Compact controls sit beside spacious results; structure comes from alignment and separation rather than decorative imagery.

The interface makes preview, live, and recorded states readable in text. Evidence keeps its explanatory context, and keyboard access remains part of the visual system. This records the implemented native-browser interface in `web/style.css`, `web/index.html`, and `web/app.js`.

**Key Characteristics:**

- Flat, lightly bordered surfaces.
- Compact system typography with generous explanatory line spacing.
- Blue action and selection cues; semantic status colors.
- Persistent desktop navigation that becomes horizontal on smaller screens.

## Colors

The palette pairs a warm outer shell with white controls and a cooler result canvas.

### Primary

- **Action blue** (`accent`): primary buttons, links, and native form accents.
- **Pale blue** (`blue-soft`): the selected navigation background.

### Neutral

- **Near-black** (`ink`): headings and control text.
- **Slate** (`muted`): explanation, metadata, and supporting labels.
- **Warm white** (`warm-white`): page and navigation background.
- **White** (`surface`): controls and contained results.
- **Cool mist** (`subtle`): the result canvas.
- **Divider gray** (`line`): section and panel boundaries.
- **Field gray** (`field-border`): textarea and select outlines.

Success green marks configured/local status and validated responses. Warning ochre marks human review; errors use red text. These are semantic cues, not additional brand accents.

**The Explicit State Rule.** Pair status color with readable state text; preview, live, and recorded labels carry the meaning.

## Typography

**Body and heading font:** Segoe UI, with Arial and sans-serif fallbacks. The system uses a compact, non-geometric type hierarchy rather than a display face. There is no fixed modular ratio.

Page headlines use the headline token; section titles use the title token. The Learn headline grows to 2rem on desktop and returns to the headline size below 900px. Empty-state headlines are 1.4rem; result outcomes are 1.6rem. The root body token establishes inheritance; working copy is commonly .8–.9rem, with the hint token shared across explanations. Form labels are semibold; tags are smaller and medium-weight.

Long explanations use line heights of 1.6–1.85. Metadata, threshold outputs, and probability values use tabular numerals. JSON uses the browser's monospace default.

**The Quiet Hierarchy Rule.** Use size, weight, spacing, and muted supporting copy to separate titles from explanation.

## Layout

The desktop frame has a 64px context bar and 208px navigation column. Workspaces split into 360px controls and a flexible result canvas. Controls and results scroll independently within the remaining viewport height. Control padding is 28px 26px; the result canvas uses 28px 32px. Repeated section boundaries combine thin rules with roughly 22–28px spacing.

At 1500px and above, controls widen to 390px and padding increases; paired matrices can occupy two columns. At 1100px and below, navigation narrows to 172px and controls to 320px; metadata becomes a single column. At 900px and below, navigation becomes horizontal, controls stack above results, and document scrolling replaces constrained panel scrolling. At 480px and below, primary panel padding is 24px 20px and navigation becomes more compact.

Learn content is bounded at 720px, with its heading at 650px. Wide tables scroll inside their own focusable regions. Long metadata and evidence strings wrap rather than expanding the page.

## Elevation & Depth

No box shadows are used. White, warm-white, and cool-neutral surfaces establish depth; one-pixel borders establish boundaries. State changes use background and border color, with 160ms transitions on buttons and navigation. Reduced-motion preference disables transitions.

**The Flat Surface Rule.** Distinguish panels through tone and thin borders rather than shadows.

## Shapes

The shell and large panels are rectangular. Small controls use the control radius, navigation and textareas use the panel-detail radius, and status tags use the tag radius. Icons are simple inline strokes; status indicators are small circles. The result outcome and empty-state symbol have individually larger rounding, not a general card scale.

## Components

### Buttons

Primary buttons span the control panel, use the action accent, have semibold text, and maintain a 44px minimum height. Hover darkens the blue. Secondary controls are white with a gray border and gain a pale neutral hover fill. Sample buttons are compact, wrapping suggestions. Disabled controls reduce opacity to .5 and use a not-allowed cursor.

### Inputs / Fields

Native textarea, select, range, and checkbox controls retain their familiar behavior. Textarea copy uses .88rem at 1.65 line height and can resize vertically; selects use .84rem. Range and checkbox accents match the primary action. Visible focus uses a three-pixel blue outline with a three-pixel offset. Every field has an explicit label; explanatory copy is associated where implemented.

### Chips

Tags are compact outlined status labels with muted text, not pill-shaped action buttons. Canvas tags inherit the canvas background.

### Cards / Containers

Result outcomes use a white bordered inset; human review switches to a pale warm background and warning text. Evidence relies on divided sections and tables rather than a repeated card grid. Limitation notes and raw JSON use an inset cool-gray fill.

### Navigation

Workspace links combine a stroke icon and medium-weight label. The selected destination uses a pale-blue fill, blue text, and a light-blue border, identified by `aria-current`. Hover adds a neutral fill. Narrow layouts retain Playground, Evidence, Learn and Agent Lab in a horizontal row. Route changes update the context label and move keyboard focus to the destination heading; a skip link targets the main workspace. Agent Lab reuses the configuration/result panels and native execution-consent checkbox; no chat surface or new palette is introduced.

### Decision trace and evidence

The trace is an ordered list with bold step names and muted explanatory paragraphs divided by thin rules. Probability rows align label, native meter, and tabular percentage. Tables keep captions, row/column headers, compact cells, and contained overflow. Disclosures reveal JSON, saved input, and evidence context without replacing the surrounding workspace.

## Do's and Don'ts

### Do:

- **Do** keep preview, live, and recorded state labels explicit.
- **Do** use native controls, visible keyboard focus, and reduced-motion support.
- **Do** preserve local table scrolling and stack workspaces on narrow screens.
- **Do** use muted explanatory text and thin rules to organize dense evidence.

### Don't:

- **Don't** replace status text with color alone.
- **Don't** add shadows to the flat panel hierarchy.
- **Don't** turn the decision workspace into a generic chat surface.
