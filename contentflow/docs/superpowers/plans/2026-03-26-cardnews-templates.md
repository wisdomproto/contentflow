# Cardnews Template System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand cardnews templates from 8 color-only presets to 18 diverse templates with different layouts, gradients, aspect ratios, and visual styles — all inspired by Pencil designs.

**Architecture:** Extend `CardTextStyle` with `layoutType`, `bgGradient`, `accentColor` properties. Create a new `CardLayoutRenderer` component that renders cards differently based on layout type. Keep the existing card edit/image-generation flow intact — templates only control visual rendering.

**Tech Stack:** React, TypeScript, Tailwind CSS (existing stack — no new dependencies)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/content/cardnews-card-item.tsx` | Modify | Extend `CardTextStyle` interface, add layout-aware rendering |
| `src/components/content/cardnews-templates.ts` | Create | All 18 template definitions (extracted from panel) |
| `src/components/content/cardnews-panel.tsx` | Modify | Template selector UI with categorized grid + aspect ratio indicator |

---

## Chunk 1: Template Data & Type Extensions

### Task 1: Extend CardTextStyle and create template definitions

**Files:**
- Modify: `src/components/content/cardnews-card-item.tsx:11-32`
- Create: `src/components/content/cardnews-templates.ts`

- [ ] **Step 1: Extend CardTextStyle interface**

In `cardnews-card-item.tsx`, add new optional properties to `CardTextStyle`:

```typescript
export interface CardTextStyle {
  // --- existing properties (keep all) ---
  fontSize?: number;
  fontWeight?: string;
  textAlign?: string;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  bgEnabled?: boolean;
  bgOpacity?: number;
  bgBlur?: number;
  bgColor?: string;
  bgBorderColor?: string;
  boxX?: number;
  boxY?: number;
  boxW?: number;
  boxH?: number;
  headline?: string;
  body?: string;
  headlineBodyGap?: number;
  headlineFontSize?: number;
  bodyFontSize?: number;
  // --- new properties ---
  /** Layout type determines how text and image are arranged */
  layoutType?: 'standard' | 'text-only' | 'photo-bg' | 'split-top' | 'split-left' | 'bento' | 'numbered';
  /** CSS gradient string for background (overrides bgColor when set) */
  bgGradient?: string;
  /** Accent color for decorative elements (lines, badges, numbers) */
  accentColor?: string;
  /** Suggested aspect ratio for this template */
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  /** Text vertical position within text area */
  textPosition?: 'top' | 'center' | 'bottom';
}
```

- [ ] **Step 2: Create cardnews-templates.ts with all 18 templates**

```typescript
// src/components/content/cardnews-templates.ts
import type { CardTextStyle } from './cardnews-card-item';

export interface CardTemplate {
  id: string;
  name: string;
  category: 'solid' | 'gradient' | 'photo' | 'layout';
  style: Partial<CardTextStyle>;
  /** Thumbnail preview colors for the template selector */
  preview: { bg: string; text: string; accent?: string };
}

export const CARD_TEMPLATES: CardTemplate[] = [
  // ─── Category: Solid Background ───
  {
    id: 'clean-white',
    name: '클린 화이트',
    category: 'solid',
    style: {
      layoutType: 'standard',
      bgColor: '#ffffff', color: '#1a1a1a', strokeWidth: 0,
      headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6,
      aspectRatio: '4:5',
    },
    preview: { bg: '#ffffff', text: '#1a1a1a' },
  },
  {
    id: 'dark-modern',
    name: '다크 모던',
    category: 'solid',
    style: {
      layoutType: 'standard',
      bgColor: '#1a1a2e', color: '#ffffff', strokeWidth: 0,
      headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6,
      aspectRatio: '4:5',
    },
    preview: { bg: '#1a1a2e', text: '#ffffff' },
  },
  {
    id: 'navy-blue',
    name: '네이비 블루',
    category: 'solid',
    style: {
      layoutType: 'standard',
      bgColor: '#0f3460', color: '#e8f1f8', strokeWidth: 0,
      headlineFontSize: 24, bodyFontSize: 14, textAlign: 'center', headlineBodyGap: 8,
      aspectRatio: '4:5',
    },
    preview: { bg: '#0f3460', text: '#e8f1f8' },
  },
  {
    id: 'forest-green',
    name: '포레스트 그린',
    category: 'solid',
    style: {
      layoutType: 'standard',
      bgColor: '#2d6a4f', color: '#f0fdf4', strokeWidth: 0,
      headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6,
      aspectRatio: '4:5',
    },
    preview: { bg: '#2d6a4f', text: '#f0fdf4' },
  },
  {
    id: 'coral-pink',
    name: '코랄 핑크',
    category: 'solid',
    style: {
      layoutType: 'standard',
      bgColor: '#e76f51', color: '#ffffff', strokeWidth: 0,
      headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6,
      aspectRatio: '4:5',
    },
    preview: { bg: '#e76f51', text: '#ffffff' },
  },
  {
    id: 'royal-purple',
    name: '로얄 퍼플',
    category: 'solid',
    style: {
      layoutType: 'standard',
      bgColor: '#533483', color: '#f3e8ff', strokeWidth: 0,
      headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6,
      aspectRatio: '4:5',
    },
    preview: { bg: '#533483', text: '#f3e8ff' },
  },
  {
    id: 'pastel-beige',
    name: '파스텔 베이지',
    category: 'solid',
    style: {
      layoutType: 'standard',
      bgColor: '#fdf6ec', color: '#5c4033', strokeWidth: 0,
      headlineFontSize: 20, bodyFontSize: 12, textAlign: 'center', headlineBodyGap: 4,
      aspectRatio: '4:5',
    },
    preview: { bg: '#fdf6ec', text: '#5c4033' },
  },
  {
    id: 'bold-black',
    name: '볼드 블랙',
    category: 'solid',
    style: {
      layoutType: 'standard',
      bgColor: '#000000', color: '#ffd93d', strokeWidth: 1, strokeColor: '#000000',
      headlineFontSize: 26, bodyFontSize: 14, textAlign: 'center', headlineBodyGap: 8,
      aspectRatio: '4:5',
    },
    preview: { bg: '#000000', text: '#ffd93d' },
  },
  // ─── Category: Gradient Background ───
  {
    id: 'minimal-accent',
    name: '미니멀 악센트',
    category: 'solid',
    style: {
      layoutType: 'text-only',
      bgColor: '#ffffff', color: '#1a1a1a', strokeWidth: 0,
      headlineFontSize: 28, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 10,
      accentColor: '#FF6B35', aspectRatio: '1:1',
    },
    preview: { bg: '#ffffff', text: '#1a1a1a', accent: '#FF6B35' },
  },
  {
    id: 'neon-dark',
    name: '네온 다크',
    category: 'gradient',
    style: {
      layoutType: 'text-only',
      bgGradient: 'linear-gradient(160deg, #0A0A0F 0%, #1A1035 100%)',
      bgColor: '#0A0A0F', color: '#ffffff', strokeWidth: 0,
      headlineFontSize: 28, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 12,
      accentColor: '#00FF88', aspectRatio: '1:1',
    },
    preview: { bg: '#0A0A0F', text: '#ffffff', accent: '#00FF88' },
  },
  {
    id: 'pastel-soft',
    name: '파스텔 소프트',
    category: 'gradient',
    style: {
      layoutType: 'text-only',
      bgGradient: 'linear-gradient(135deg, #FFF0F5 0%, #F0F4FF 50%, #F0FFF4 100%)',
      bgColor: '#FFF0F5', color: '#2D2D2D', strokeWidth: 0,
      headlineFontSize: 26, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 10,
      accentColor: '#C06090', aspectRatio: '1:1',
    },
    preview: { bg: '#FFF0F5', text: '#2D2D2D', accent: '#C06090' },
  },
  {
    id: 'bold-gradient',
    name: '볼드 레드',
    category: 'gradient',
    style: {
      layoutType: 'text-only',
      bgGradient: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)',
      bgColor: '#FF416C', color: '#ffffff', strokeWidth: 0,
      headlineFontSize: 32, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 14,
      accentColor: '#ffffff', aspectRatio: '4:5',
    },
    preview: { bg: '#FF416C', text: '#ffffff' },
  },
  {
    id: 'purple-cover',
    name: '퍼플 커버',
    category: 'gradient',
    style: {
      layoutType: 'text-only',
      bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      bgColor: '#764ba2', color: '#ffffff', strokeWidth: 0,
      headlineFontSize: 30, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 10,
      accentColor: '#ffffff', aspectRatio: '1:1',
    },
    preview: { bg: '#764ba2', text: '#ffffff' },
  },
  {
    id: 'quote-gradient',
    name: '명언 카드',
    category: 'gradient',
    style: {
      layoutType: 'text-only',
      bgGradient: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
      bgColor: '#667eea', color: '#ffffff', strokeWidth: 0,
      headlineFontSize: 26, bodyFontSize: 12, textAlign: 'center', headlineBodyGap: 16,
      accentColor: '#ffffff', aspectRatio: '1:1',
      textPosition: 'center',
    },
    preview: { bg: '#667eea', text: '#ffffff' },
  },
  // ─── Category: Photo Background ───
  {
    id: 'photo-overlay',
    name: '사진 오버레이',
    category: 'photo',
    style: {
      layoutType: 'photo-bg',
      bgColor: '#000000', color: '#ffffff', strokeWidth: 0,
      headlineFontSize: 26, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 10,
      accentColor: '#ffffff', aspectRatio: '1:1',
      textPosition: 'bottom',
    },
    preview: { bg: '#333333', text: '#ffffff' },
  },
  {
    id: 'story-cover',
    name: '스토리 커버',
    category: 'photo',
    style: {
      layoutType: 'photo-bg',
      bgColor: '#000000', color: '#ffffff', strokeWidth: 0,
      headlineFontSize: 30, bodyFontSize: 14, textAlign: 'center', headlineBodyGap: 12,
      accentColor: '#ffffff', aspectRatio: '9:16',
      textPosition: 'center',
    },
    preview: { bg: '#1a3a4a', text: '#ffffff' },
  },
  // ─── Category: Special Layout ───
  {
    id: 'magazine-split',
    name: '매거진 스플릿',
    category: 'layout',
    style: {
      layoutType: 'split-top',
      bgColor: '#ffffff', color: '#1a1a1a', strokeWidth: 0,
      headlineFontSize: 22, bodyFontSize: 12, textAlign: 'left', headlineBodyGap: 8,
      accentColor: '#E74C3C', aspectRatio: '4:5',
    },
    preview: { bg: '#ffffff', text: '#1a1a1a', accent: '#E74C3C' },
  },
  {
    id: 'landscape-split',
    name: '랜드스케이프',
    category: 'layout',
    style: {
      layoutType: 'split-left',
      bgGradient: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
      bgColor: '#0F172A', color: '#ffffff', strokeWidth: 0,
      headlineFontSize: 22, bodyFontSize: 12, textAlign: 'left', headlineBodyGap: 8,
      accentColor: '#FBBF24', aspectRatio: '16:9',
    },
    preview: { bg: '#0F172A', text: '#ffffff', accent: '#FBBF24' },
  },
];

/** Group templates by category for the selector UI */
export const TEMPLATE_CATEGORIES = [
  { id: 'solid', label: '단색 배경', icon: '■' },
  { id: 'gradient', label: '그라데이션', icon: '◆' },
  { id: 'photo', label: '사진 배경', icon: '◻' },
  { id: 'layout', label: '특수 레이아웃', icon: '⊞' },
] as const;
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds (new file is standalone, existing types only have additive changes)

- [ ] **Step 4: Commit**

```bash
git add src/components/content/cardnews-card-item.tsx src/components/content/cardnews-templates.ts
git commit -m "feat: add cardnews template definitions with layout types and gradients"
```

---

## Chunk 2: Layout-Aware Card Rendering

### Task 2: Update CardNewsCardItem to render based on layoutType

**Files:**
- Modify: `src/components/content/cardnews-card-item.tsx:135-198` (card rendering section)

The current card layout is hardcoded as "top 40% text / bottom 60% image". We need to make it conditional based on `layoutType`.

- [ ] **Step 1: Add background gradient rendering support**

In `CardNewsCardItem`, update the main card container to support `bgGradient`:

```tsx
// In the card preview div (line ~141), change:
// style={{ aspectRatio: '4/5', backgroundColor: style.bgColor || card.background_color || '#1a1a2e' }}
// To:
style={{
  aspectRatio: getAspectRatioCSS(style.aspectRatio || '4/5'),
  background: style.bgGradient || style.bgColor || card.background_color || '#1a1a2e',
}}
```

Add helper at top of file:

```typescript
function getAspectRatioCSS(ratio: string): string {
  const map: Record<string, string> = { '1:1': '1/1', '4:5': '4/5', '9:16': '9/16', '16:9': '16/9' };
  return map[ratio] || '4/5';
}
```

- [ ] **Step 2: Add layout-specific rendering**

Replace the hardcoded "top 40% text + bottom 60% image" layout with a conditional renderer.

For `text-only` layout: Full area is text, no image section.
For `photo-bg` layout: Full background image with gradient overlay + text on top.
For `split-top` layout: Top 50% image, bottom 50% text.
For `split-left` layout: Left 50% text, right 50% image (horizontal).
For `standard` layout: Keep existing top 40% text / bottom 60% image.

Key: The text editing inputs (headline, body, image prompt) below the card preview stay THE SAME for all layouts. Only the visual preview changes.

```tsx
// Replace the card preview section (lines ~137-198) with:
{(() => {
  const layout = style.layoutType || 'standard';
  const bgStyle = style.bgGradient
    ? { background: style.bgGradient }
    : { backgroundColor: style.bgColor || card.background_color || '#1a1a2e' };
  const ar = getAspectRatioCSS(style.aspectRatio || '4/5');

  if (layout === 'text-only') {
    return (
      <div ref={containerRef} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: ar, ...bgStyle }}>
        <span className="absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-white/70 z-10">{index + 1}</span>
        {style.accentColor && (
          <div className="absolute top-3 left-3 w-8 h-1 rounded" style={{ backgroundColor: style.accentColor }} />
        )}
        <div className="absolute inset-0 flex items-center justify-center p-5">
          {card.text_content ? (
            <CardTextOverlay style={style} hasImage={false} />
          ) : (
            <p className="text-xs text-white/40">텍스트를 입력하세요</p>
          )}
        </div>
        {/* Delete button */}
        <div className="absolute top-2 right-2 z-10">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white">
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
    );
  }

  if (layout === 'photo-bg') {
    return (
      <div ref={containerRef} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: ar, ...bgStyle }}>
        <span className="absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-white/70 z-10">{index + 1}</span>
        {/* Full background image */}
        {card.background_image_url && (
          <img src={card.background_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />
        {/* Text at bottom or center */}
        <div className={cn(
          "absolute inset-x-0 p-4 z-10",
          style.textPosition === 'center' ? 'inset-0 flex items-center justify-center' : 'bottom-0'
        )}>
          {card.text_content ? (
            <CardTextOverlay style={{ ...style, color: style.color || '#ffffff' }} hasImage={true} />
          ) : (
            <p className="text-xs text-white/40">텍스트를 입력하세요</p>
          )}
        </div>
        {/* Image controls (regenerate/upload) */}
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white">
            <Trash2 size={12} />
          </Button>
        </div>
        {!card.background_image_url && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <ImageCardWidget
              src={null} alt={`슬라이드 ${index + 1}`} aspectClass="h-full"
              isGenerating={isRegeneratingThis}
              onRegenerate={onRegenerateImage}
              onDelete={() => {}}
              onUpload={(file) => { const r = new FileReader(); r.onload = () => onUpdate(card.id, { background_image_url: r.result as string }); r.readAsDataURL(file); }}
              placeholder="배경 이미지 생성 또는 업로드"
            />
          </div>
        )}
      </div>
    );
  }

  if (layout === 'split-top') {
    return (
      <div ref={containerRef} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: ar, ...bgStyle }}>
        <span className="absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-white/70 z-10">{index + 1}</span>
        {/* Top: image (50%) */}
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: '50%' }}>
          <ImageCardWidget src={card.background_image_url || null} alt={`슬라이드 ${index + 1}`} aspectClass="h-full"
            isGenerating={isRegeneratingThis} onRegenerate={onRegenerateImage}
            onDelete={() => onUpdate(card.id, { background_image_url: null })}
            onUpload={(file) => { const r = new FileReader(); r.onload = () => onUpdate(card.id, { background_image_url: r.result as string }); r.readAsDataURL(file); }}
            onRestore={(url) => onUpdate(card.id, { background_image_url: url })}
            placeholder="이미지"
          />
        </div>
        {/* Bottom: text (50%) */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center p-4" style={{ height: '50%' }}>
          {card.text_content ? (
            <CardTextOverlay style={style} hasImage={false} />
          ) : (
            <p className="text-xs opacity-40" style={{ color: style.color || '#1a1a1a' }}>텍스트를 입력하세요</p>
          )}
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white">
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
    );
  }

  if (layout === 'split-left') {
    return (
      <div ref={containerRef} className="relative rounded-lg overflow-hidden flex" style={{ aspectRatio: ar, ...bgStyle }}>
        <span className="absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-white/70 z-10">{index + 1}</span>
        {/* Left: text (50%) */}
        <div className="w-1/2 flex items-center justify-center p-4">
          {card.text_content ? (
            <CardTextOverlay style={style} hasImage={false} />
          ) : (
            <p className="text-xs opacity-40" style={{ color: style.color || '#ffffff' }}>텍스트</p>
          )}
        </div>
        {/* Right: image (50%) */}
        <div className="w-1/2 overflow-hidden">
          <ImageCardWidget src={card.background_image_url || null} alt={`슬라이드 ${index + 1}`} aspectClass="h-full"
            isGenerating={isRegeneratingThis} onRegenerate={onRegenerateImage}
            onDelete={() => onUpdate(card.id, { background_image_url: null })}
            onUpload={(file) => { const r = new FileReader(); r.onload = () => onUpdate(card.id, { background_image_url: r.result as string }); r.readAsDataURL(file); }}
            onRestore={(url) => onUpdate(card.id, { background_image_url: url })}
            placeholder="이미지"
          />
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white">
            <Trash2 size={12} />
          </Button>
        </div>
      </div>
    );
  }

  // Default: 'standard' — existing layout (top 40% text, bottom 60% image)
  // Keep current rendering unchanged
  return (/* ... existing standard layout code ... */);
})()}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/content/cardnews-card-item.tsx
git commit -m "feat: layout-aware card rendering for text-only, photo-bg, split layouts"
```

---

## Chunk 3: Template Selector UI

### Task 3: Update template selector in CardNewsPanel

**Files:**
- Modify: `src/components/content/cardnews-panel.tsx:22-57` (remove old CARD_TEMPLATES)
- Modify: `src/components/content/cardnews-panel.tsx:757-779` (template selector UI)

- [ ] **Step 1: Replace old templates with new import**

Remove the `CARD_TEMPLATES` constant (lines 22-57) and replace with:

```typescript
import { CARD_TEMPLATES, TEMPLATE_CATEGORIES } from './cardnews-templates';
```

Update `applyGlobalStyle` call to also handle `layoutType`, `bgGradient`, `accentColor`, `aspectRatio`, `textPosition`:

```typescript
const applyGlobalStyle = (updates: Partial<CardTextStyle>) => {
  const next = { ...globalStyle, ...updates };
  setGlobalStyle(next);
  for (const card of cards) {
    const existing = (card.text_style ?? {}) as CardTextStyle;
    updateInstagramCard(card.id, {
      text_style: { ...existing, ...next },
    });
  }
};
```

This already works — no change needed for the function itself, just for the template data that feeds into it.

- [ ] **Step 2: Update template selector UI with categories and better previews**

Replace the template grid (lines ~757-779) with a categorized layout:

```tsx
{/* Template presets — categorized */}
{cards.length > 0 && (
  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
    <h3 className="text-xs font-semibold">템플릿</h3>

    {TEMPLATE_CATEGORIES.map(cat => {
      const templates = CARD_TEMPLATES.filter(t => t.category === cat.id);
      if (templates.length === 0) return null;
      return (
        <div key={cat.id} className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">{cat.icon} {cat.label}</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => applyGlobalStyle(t.style)}
                className="rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                title={t.name}
              >
                <div
                  className="aspect-square relative"
                  style={{ background: t.style.bgGradient || t.preview.bg }}
                >
                  {/* Accent line indicator */}
                  {t.preview.accent && (
                    <div className="absolute top-1.5 left-1.5 w-4 h-0.5 rounded" style={{ backgroundColor: t.preview.accent }} />
                  )}
                  {/* Layout type indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-[6px] font-bold truncate px-1" style={{ color: t.preview.text }}>Aa</p>
                    </div>
                  </div>
                  {/* Aspect ratio badge */}
                  {t.style.aspectRatio && t.style.aspectRatio !== '4:5' && (
                    <span className="absolute bottom-1 right-1 text-[5px] font-mono px-0.5 rounded bg-black/30 text-white/70">
                      {t.style.aspectRatio}
                    </span>
                  )}
                </div>
                <p className="text-[8px] text-center py-0.5 bg-muted/50 truncate px-0.5">{t.name}</p>
              </button>
            ))}
          </div>
        </div>
      );
    })}

    {/* ... existing style adjustment controls (font color, bg color, etc.) stay unchanged ... */}
  </div>
)}
```

- [ ] **Step 3: Update fullscreen preview to respect layoutType**

In the fullscreen preview modal (lines ~888-950), update the rendering to handle different layouts similarly to the card item. The key change is using `bgGradient` and `aspectRatio`:

```tsx
<div
  className="relative rounded-lg overflow-hidden"
  style={{
    width: '64vmin',
    aspectRatio: getAspectRatioCSS(previewStyle.aspectRatio || '4/5'),
    background: previewStyle.bgGradient || previewStyle.bgColor || cards[previewIndex].background_color || '#1a1a2e',
  }}
>
```

Import `getAspectRatioCSS` from `cardnews-card-item.tsx` (export it from there).

- [ ] **Step 4: Verify build and visual check**

Run: `npm run build`
Expected: Build succeeds

Run: `npm run dev` — open the cardnews tab, verify:
1. Templates are grouped by category (단색, 그라데이션, 사진, 특수 레이아웃)
2. Clicking a gradient template applies gradient background
3. Clicking a text-only template removes the image area
4. Aspect ratio badge shows on non-4:5 templates

- [ ] **Step 5: Commit**

```bash
git add src/components/content/cardnews-panel.tsx
git commit -m "feat: categorized template selector with 18 cardnews templates"
```

---

## Summary

| Task | Description | Files | Est. Complexity |
|------|-------------|-------|----------------|
| 1 | Type extensions + 18 template definitions | cardnews-card-item.tsx, cardnews-templates.ts (new) | Low |
| 2 | Layout-aware card rendering | cardnews-card-item.tsx | Medium |
| 3 | Template selector UI + preview updates | cardnews-panel.tsx | Medium |
