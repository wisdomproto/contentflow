import type { BlogCard, InstagramCard } from './database'

/**
 * Typed view of the `BlogCard.content` JSONB column.
 *
 * The DB schema uses `Record<string, unknown>` for forward compatibility,
 * but in practice every blog card stores these fields.  Use {@link getBlogCardContent}
 * to cast from the raw DB row to this shape.
 */
export interface BlogCardContent {
  text?: string
  url?: string
  alt?: string
  caption?: string
  image_prompt?: string
  image_style?: string
}

export function getBlogCardContent(card: BlogCard): BlogCardContent {
  return (card.content ?? {}) as BlogCardContent
}

/**
 * Global style applied to all cards of a blog post (align, font, sizes…).
 * Persisted in `BlogContent.seo_details.globalStyle`.
 */
export interface GlobalCardStyle {
  align?: 'left' | 'center' | 'right' | 'justify'
  headingBold?: boolean
  bodyBold?: boolean
  headingFont?: string
  bodyFont?: string
  headingSize?: number
  bodySize?: number
}

/** A positioned, styled text block within an Instagram card canvas. */
export interface TextBlock {
  id: string
  text: string
  /** % from left (0-100) */
  x: number
  /** % from top (0-100) */
  y: number
  fontSize: number
  color: string
  fontFamily?: string
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right' | 'justify'
  /** % of card width */
  width: number
  /** % of card height (auto if undefined) */
  height?: number
  /** Hide this block from the canvas. */
  hidden?: boolean
  shadow?: boolean
}

/** Canvas state for a single Instagram card (cardnews slide). */
export interface CardCanvasData {
  bgColor: string
  imageUrl: string | null
  /** object-position Y (%) */
  imageY: number
  textBlocks: TextBlock[]
}

/** Loose view of the legacy `text_style` shape kept on the DB row. */
export function getInstagramCardStyle(card: InstagramCard): Record<string, unknown> {
  return (card.text_style ?? {}) as Record<string, unknown>
}
