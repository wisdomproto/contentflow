# Cardnews Redesign - PowerPoint-Style Canvas

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** COMPLETED (2026-03-29)

**Goal:** Rebuild the cardnews (Instagram carousel) editor as a PowerPoint-style canvas with draggable text blocks, background images, magnetic grid snapping, and a simplified template system.

**Architecture:** Each card is a fixed 4:5 canvas with three layers: background color, optional image (full-width, vertical drag only), and multiple draggable text blocks. Text blocks snap to a 10% grid. The `InstagramCard.text_style` field stores the new `CardCanvasData` structure. Templates define preset layouts. AI generation produces header/title/body/footer text blocks per card.

**Tech Stack:** React, TypeScript, Zustand (existing store), Tailwind CSS, pointer events for drag

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/content/cardnews-card-item.tsx` | **Rewrite** | Canvas renderer + drag logic + text block editing |
| `src/components/content/cardnews-templates.ts` | **Rewrite** | New template definitions using CardCanvasData |
| `src/components/content/cardnews-panel.tsx` | **Major modify** | Remove old style controls, update AI parser, simplified template picker |
| `src/components/content/create-template-dialog.tsx` | **Delete** | No longer needed (templates are code-defined) |
| `src/lib/prompt-builder.ts` | **Modify** | Update cardnews prompt to produce header/title/body/footer |

### Data Model (stored in `InstagramCard.text_style`)

```typescript
// New interfaces in cardnews-card-item.tsx

interface TextBlock {
  id: string;           // 'header' | 'title' | 'body' | 'footer' | custom id
  text: string;
  x: number;            // % from left (0-100), snaps to 10% grid
  y: number;            // % from top (0-100), snaps to 10% grid
  fontSize: number;     // px
  color: string;        // hex
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  width: number;        // % of card width (default 80)
}

interface CardCanvasData {
  bgColor: string;                    // background color
  imageUrl: string | null;            // background_image_url (synced to card field)
  imageY: number;                     // image vertical position % (0-100), snaps to 10%
  textBlocks: TextBlock[];            // draggable text elements
}
```

### Template Structure

```typescript
interface CardTemplate {
  id: string;
  name: string;
  bgColor: string;
  textBlocks: Omit<TextBlock, 'text'>[];  // positions without text content
  imageY: number;
  preview: { bg: string; textColor: string };
}
```

---

## Chunk 1: Core Canvas Component

### Task 1: Rewrite cardnews-card-item.tsx - Data types + Canvas renderer

**Files:**
- Rewrite: `src/components/content/cardnews-card-item.tsx`

- [ ] **Step 1: Write new type definitions and helper functions**

Replace entire file content. Start with types, grid helpers, and the canvas component:

```typescript
// New CardCanvasData, TextBlock interfaces
// SNAP_THRESHOLD = 10 (% grid)
// snapToGrid(value: number) => Math.round(value / 10) * 10
// getAspectRatioCSS - keep only '4:5' → '4/5'
// parseCanvasData(textStyle: Record<string, unknown> | null): CardCanvasData
//   - Migrates old format (headline/body) to new TextBlock[] format
//   - Returns default canvas data if null
```

- [ ] **Step 2: Build CardCanvas component - static rendering**

The canvas renders three layers:
1. Background div with `bgColor`
2. Image (if exists) at `imageY` position, full width, `object-cover`
3. TextBlock elements positioned absolutely at `(x%, y%)` with styles

```typescript
// CardCanvas component props:
//   card: InstagramCard
//   canvasData: CardCanvasData
//   selectedBlockId: string | null
//   onSelectBlock: (id: string | null) => void
//   onUpdateCanvas: (data: CardCanvasData) => void
//   isGeneratingImage: boolean
//   onGenerateImage: () => void
//   onDeleteCard: () => void
//   index: number

// Renders:
// <div style={{ aspectRatio: '4/5', backgroundColor: canvasData.bgColor }}>
//   {/* Grid guides - 10% lines, shown on hover */}
//   {/* Image layer */}
//   {/* Text blocks */}
//   {/* Index badge + delete button */}
// </div>
```

- [ ] **Step 3: Implement grid guides overlay**

Render subtle guide lines at every 10% horizontally and vertically. Only visible when dragging or on card hover.

```typescript
// GridGuides component
// 9 vertical lines (10% to 90%) + 9 horizontal lines
// className="pointer-events-none opacity-0 group-hover/canvas:opacity-100"
// Light lines: border-white/10 or border-black/10 depending on bg brightness
```

- [ ] **Step 4: Implement text block dragging with grid snap**

Pointer events on each text block for drag:
- `onPointerDown` → capture start position
- `onPointerMove` → calculate delta in % of container, apply snap
- `onPointerUp` → finalize position
- `snapToGrid(value)` snaps to nearest 10%

```typescript
// useDrag hook or inline handlers
// SNAP_THRESHOLD = 5 (if within 5% of grid line, snap to it)
// During drag: show which grid line is being snapped to (highlight)
```

- [ ] **Step 5: Implement image vertical drag with grid snap**

Image drag only allows Y-axis movement:
- Image renders at full width with `object-cover`
- Drag changes `imageY` (0-100%), snaps to 10% grid
- `imageY` represents the `object-position` Y value

- [ ] **Step 6: Commit**

```bash
git add src/components/content/cardnews-card-item.tsx
git commit -m "feat: rewrite cardnews canvas with draggable text blocks and grid snapping"
```

---

### Task 2: Text block editing panel (below canvas)

**Files:**
- Modify: `src/components/content/cardnews-card-item.tsx`

- [ ] **Step 1: Build TextBlockEditor component**

Below each canvas card, show editing controls for the selected text block:
- Text input (textarea)
- Font size (number input, 8-72)
- Color (color picker)
- Font weight toggle (normal/bold)
- Text align (left/center/right)
- Position display (x%, y%) - editable
- Delete block button

```typescript
// TextBlockEditor props:
//   block: TextBlock
//   onChange: (updates: Partial<TextBlock>) => void
//   onDelete: () => void
```

- [ ] **Step 2: Build card-level controls**

Above the canvas or integrated:
- Background color picker (small color input)
- "Add text" button → adds new TextBlock at center
- Image upload / generate button

- [ ] **Step 3: Wire up the full CardNewsCardItem export**

The exported `CardNewsCardItem` component combines:
- `CardCanvas` (the visual card)
- `TextBlockEditor` (editing panel, shown when block selected)
- Card controls (bg color, add text, image)
- Image prompt toggle (collapsible)

- [ ] **Step 4: Export AddSlideButton (keep as-is)**

- [ ] **Step 5: Commit**

```bash
git add src/components/content/cardnews-card-item.tsx
git commit -m "feat: add text block editing panel and card controls"
```

---

## Chunk 2: Templates + Panel Cleanup

### Task 3: Rewrite templates

**Files:**
- Rewrite: `src/components/content/cardnews-templates.ts`
- Delete: `src/components/content/create-template-dialog.tsx`

- [ ] **Step 1: Define new template format and presets**

8 templates covering common cardnews layouts:

1. **클린 센터** - white bg, header top-center, title center, body below title, footer bottom
2. **다크 모던** - dark bg, left-aligned text blocks with accent header
3. **미니멀** - light gray bg, centered title only (large), small footer
4. **매거진** - white bg, header top-left small, large title left, body left, footer bottom-right
5. **볼드 그라데이션** - dark bg, very large centered title, small body below
6. **포토 커버** - dark bg (for image overlay), bottom-positioned text blocks
7. **스텝 카드** - light bg, numbered header top, title+body center
8. **브랜드 카드** - colored bg, header=brand, large title center, CTA footer

Each template defines: `bgColor`, `textBlocks[]` (without text content - just positions/styles), `imageY`

```typescript
export interface CardTemplate {
  id: string;
  name: string;
  bgColor: string;
  textBlocks: Omit<TextBlock, 'text'>[];
  imageY: number;
  preview: { bg: string; textColor: string };
}

export const CARD_TEMPLATES: CardTemplate[] = [...]
```

- [ ] **Step 2: Delete create-template-dialog.tsx**

```bash
rm src/components/content/create-template-dialog.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: rewrite cardnews templates with new canvas format"
```

---

### Task 4: Rewrite cardnews-panel.tsx

**Files:**
- Major modify: `src/components/content/cardnews-panel.tsx`

- [ ] **Step 1: Remove old imports and state**

Remove:
- `CardTextOverlay`, `getAspectRatioCSS`, `CardTextStyle` imports
- `CreateTemplateDialog` import
- `globalStyle` state and `applyGlobalStyle` function
- `hiddenTemplates`, `showHidden`, `customTemplates` state
- All old style adjustment UI (background pickers, font controls, alignment, etc.)
- `isTemplateOpen`, `activeCategory` state
- `TEMPLATE_CATEGORIES` import

- [ ] **Step 2: Simplify template picker**

New template UI: simple horizontal scroll of template preview cards. Click to apply.

Applying a template:
1. For each existing card, update `text_style` with template's `bgColor` + `textBlocks` positions (keep existing text content)
2. If card has fewer text blocks than template, add empty ones
3. If card has more, keep extras

```typescript
const applyTemplate = (template: CardTemplate) => {
  for (const card of cards) {
    const existing = parseCanvasData(card.text_style);
    const newBlocks = template.textBlocks.map(tb => {
      const existingBlock = existing.textBlocks.find(b => b.id === tb.id);
      return { ...tb, text: existingBlock?.text ?? '' };
    });
    updateInstagramCard(card.id, {
      text_style: {
        bgColor: template.bgColor,
        imageY: template.imageY,
        textBlocks: newBlocks,
      },
      background_color: template.bgColor,
    });
  }
};
```

- [ ] **Step 3: Update AI response parser**

Change the `onComplete` callback to create cards with new `CardCanvasData` format:

```typescript
// For each AI-generated slide:
const canvasData: CardCanvasData = {
  bgColor: '#18181b',  // default dark
  imageUrl: null,
  imageY: 50,
  textBlocks: [
    { id: 'header', text: slide.header || '', x: 10, y: 5, fontSize: 11, color: '#8B5CF6', fontWeight: 'bold', textAlign: 'left', width: 80 },
    { id: 'title', text: slide.title || slide.headline || '', x: 10, y: 15, fontSize: 28, color: '#ffffff', fontWeight: 'bold', textAlign: 'left', width: 80 },
    { id: 'body', text: slide.body || '', x: 10, y: 55, fontSize: 14, color: '#cccccc', fontWeight: 'normal', textAlign: 'left', width: 80 },
    { id: 'footer', text: slide.footer || '', x: 10, y: 90, fontSize: 10, color: '#666666', fontWeight: 'normal', textAlign: 'left', width: 80 },
  ],
};
```

- [ ] **Step 4: Keep working features, remove dead code**

Keep:
- AI text generation + image generation
- Caption & hashtags (collapsible)
- Slide text editor (collapsible)
- Reference image
- Preview modal (simplify to just render canvas data)
- Download functionality
- Card grid (2 columns)

Remove:
- All old style adjustment sections
- ChannelModelSelector `aspectRatio` control (fixed 4:5)
- Old `applyGlobalStyle` and related state

- [ ] **Step 5: Update preview modal**

Simplify the fullscreen preview to render the canvas directly:
- Read `CardCanvasData` from card's `text_style`
- Render the same layers (bg → image → text blocks) at larger scale

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: rewrite cardnews panel with simplified template picker and canvas integration"
```

---

## Chunk 3: Prompt Builder + Migration

### Task 5: Update prompt builder

**Files:**
- Modify: `src/lib/prompt-builder.ts`

- [ ] **Step 1: Update cardnews prompt output format**

Change the AI output format to include `header`, `title`, `body`, `footer` per slide:

```typescript
// New format in prompt:
// {
//   "caption": "...",
//   "hashtags": [...],
//   "slides": [
//     {
//       "header": "카테고리/라벨 (5~10자)",
//       "title": "메인 제목 (10~15자)",
//       "body": "본문 설명 (30~50자)",
//       "footer": "CTA 또는 출처 (10~20자)",
//       "image_prompt": "English image prompt"
//     }
//   ]
// }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/prompt-builder.ts
git commit -m "feat: update cardnews prompt to produce header/title/body/footer"
```

---

### Task 6: Migration + backward compatibility

**Files:**
- Modify: `src/components/content/cardnews-card-item.tsx`

- [ ] **Step 1: Implement parseCanvasData migration**

The `parseCanvasData` function must handle old card data gracefully:

```typescript
function parseCanvasData(textStyle: Record<string, unknown> | null): CardCanvasData {
  if (!textStyle) return defaultCanvasData();

  // New format: has textBlocks array
  if (Array.isArray(textStyle.textBlocks)) {
    return textStyle as unknown as CardCanvasData;
  }

  // Old format: migrate headline/body/header/title/footer to textBlocks
  const old = textStyle as any;
  const blocks: TextBlock[] = [];
  if (old.header) blocks.push({ id: 'header', text: old.header, x: 10, y: 5, fontSize: old.headerFontSize || 11, color: old.headerColor || old.accentColor || '#8B5CF6', fontWeight: 'bold', textAlign: old.textAlign || 'left', width: 80 });
  if (old.headline || old.title) blocks.push({ id: 'title', text: old.title || old.headline || '', x: 10, y: 20, fontSize: old.titleFontSize || old.headlineFontSize || 28, color: old.titleColor || old.color || '#ffffff', fontWeight: 'bold', textAlign: old.textAlign || 'left', width: 80 });
  if (old.body) blocks.push({ id: 'body', text: old.body, x: 10, y: 50, fontSize: old.bodyFontSize || 14, color: old.bodyColor || old.color || '#cccccc', fontWeight: 'normal', textAlign: old.textAlign || 'left', width: 80 });
  if (old.footer) blocks.push({ id: 'footer', text: old.footer, x: 10, y: 90, fontSize: old.footerFontSize || 10, color: old.footerColor || '#666666', fontWeight: 'normal', textAlign: old.textAlign || 'left', width: 80 });

  // If no blocks found from old data, create defaults
  if (blocks.length === 0) {
    return defaultCanvasData();
  }

  return {
    bgColor: old.bgColor || '#18181b',
    imageUrl: null,
    imageY: 50,
    textBlocks: blocks,
  };
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add backward-compatible migration for old cardnews data format"
```

---

## Implementation Notes

### Grid Snapping Logic
```typescript
const GRID_SIZE = 10; // 10% increments
const SNAP_THRESHOLD = 4; // snap if within 4% of grid line

function snapToGrid(value: number): number {
  const nearest = Math.round(value / GRID_SIZE) * GRID_SIZE;
  return Math.abs(value - nearest) < SNAP_THRESHOLD ? nearest : value;
}
```

### Image Handling
- `background_image_url` on `InstagramCard` stays as the source of truth
- `CardCanvasData.imageUrl` is synced from/to `card.background_image_url`
- Image always renders at full card width with `object-cover`
- `imageY` controls `object-position: center ${imageY}%`
- Image drag only moves Y axis, snaps to 10% grid

### Text Block Drag
- Each text block is `position: absolute` with `left: ${x}%`, `top: ${y}%`
- On pointerdown: capture start position, set dragging state
- On pointermove: calculate delta as % of container size, apply snap
- On pointerup: finalize and save to store
- Show active snap lines during drag (highlighted grid lines)

### Template Application
- Templates only set positions and styles, not text content
- When applying to existing cards: keep text content, replace positions/styles
- When applying to new cards (from AI): text comes from AI, positions from template

### What Gets Removed
- `CardTextStyle` interface (replaced by `CardCanvasData` + `TextBlock`)
- `CardTextOverlay` component (replaced by inline positioned text blocks)
- `getAspectRatioCSS` function (fixed 4:5)
- All layout types (`text-only`, `photo-bg`, `split-top`, etc.)
- `TEMPLATE_CATEGORIES` and category tabs
- `globalStyle` state and `applyGlobalStyle`
- `CreateTemplateDialog` component
- All style adjustment UI (color pickers, gradient selectors, font controls, alignment buttons, etc.)
- Hidden templates state
- Custom templates localStorage logic
