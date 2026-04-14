'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MousePointer2,
  Type,
  Minus,
  ArrowRight,
  Square,
  Undo2,
  Redo2,
  Trash2,
  Save,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Types ──

type ToolType = 'select' | 'text' | 'line' | 'arrow' | 'rect'

type EditorElement = {
  id: string
  type: 'text' | 'line' | 'arrow' | 'rect'
  x: number
  y: number
  color: string
  // text
  text?: string
  fontSize?: number
  fontWeight?: string
  shadow?: boolean
  // line/arrow
  x2?: number
  y2?: number
  strokeWidth?: number
  // rect
  rectWidth?: number
  rectHeight?: number
  fillColor?: string
  borderColor?: string
  borderWidth?: number
}

interface ImageEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  onSave: (dataUrl: string) => void
}

// ── Helpers ──

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

// ── Component ──

export function ImageEditorDialog({ open, onOpenChange, src, onSave }: ImageEditorDialogProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<ToolType>('select')
  const [elements, setElements] = useState<EditorElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // history
  const [history, setHistory] = useState<EditorElement[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  // drawing state
  const drawingRef = useRef<{ id: string; startX: number; startY: number } | null>(null)
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)

  // ── Reset on open ──
  useEffect(() => {
    if (open) {
      setElements([])
      setSelectedId(null)
      setEditingId(null)
      setTool('select')
      setHistory([[]])
      setHistoryIndex(0)
    }
  }, [open])

  // ── History helpers ──
  const pushHistory = useCallback(
    (next: EditorElement[]) => {
      const trimmed = history.slice(0, historyIndex + 1)
      const updated = [...trimmed, next]
      setHistory(updated)
      setHistoryIndex(updated.length - 1)
      setElements(next)
    },
    [history, historyIndex],
  )

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const prev = historyIndex - 1
    setHistoryIndex(prev)
    setElements(history[prev])
    setSelectedId(null)
    setEditingId(null)
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const next = historyIndex + 1
    setHistoryIndex(next)
    setElements(history[next])
    setSelectedId(null)
    setEditingId(null)
  }, [history, historyIndex])

  // ── Delete selected ──
  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    const next = elements.filter((el) => el.id !== selectedId)
    pushHistory(next)
    setSelectedId(null)
    setEditingId(null)
  }, [selectedId, elements, pushHistory])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editingId) return
        deleteSelected()
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) || (e.key === 'y' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        redo()
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
        setEditingId(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, deleteSelected, undo, redo, editingId])

  // ── Get relative position from pointer event ──
  const getRelPos = useCallback((e: React.PointerEvent | PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  // ── Element drag (select mode) ──
  const handleElementPointerDown = useCallback(
    (e: React.PointerEvent, elId: string) => {
      if (tool !== 'select') return
      e.stopPropagation()
      setSelectedId(elId)
      setEditingId(null)
      const pos = getRelPos(e)
      const el = elements.find((el) => el.id === elId)
      if (!el) return
      draggingRef.current = { id: elId, offsetX: pos.x - el.x, offsetY: pos.y - el.y }

      const onMove = (ev: PointerEvent) => {
        const drag = draggingRef.current
        if (!drag) return
        const p = getRelPos(ev)
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== drag.id) return el
            const dx = p.x - drag.offsetX - el.x
            const dy = p.y - drag.offsetY - el.y
            // Move both endpoints for lines/arrows
            if ((el.type === 'line' || el.type === 'arrow') && el.x2 != null && el.y2 != null) {
              return { ...el, x: el.x + dx, y: el.y + dy, x2: el.x2 + dx, y2: el.y2 + dy }
            }
            return { ...el, x: el.x + dx, y: el.y + dy }
          }),
        )
      }
      const onUp = () => {
        if (draggingRef.current) {
          setElements((prev) => {
            pushHistory([...prev])
            return prev
          })
        }
        draggingRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [tool, elements, getRelPos, pushHistory],
  )

  // ── Canvas pointer down (draw or add text) ──
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (tool === 'select') {
        setSelectedId(null)
        setEditingId(null)
        return
      }
      const pos = getRelPos(e)

      if (tool === 'text') {
        const newEl: EditorElement = {
          id: crypto.randomUUID(),
          type: 'text',
          x: pos.x,
          y: pos.y,
          color: '#ffffff',
          text: '\ud14d\uc2a4\ud2b8',
          fontSize: 24,
          fontWeight: 'bold',
          shadow: true,
        }
        const next = [...elements, newEl]
        pushHistory(next)
        setSelectedId(newEl.id)
        setTool('select')
        return
      }

      // line / arrow / rect
      const newEl: EditorElement = {
        id: crypto.randomUUID(),
        type: tool,
        x: pos.x,
        y: pos.y,
        color: '#ff0000',
        ...(tool === 'line' || tool === 'arrow'
          ? { x2: pos.x, y2: pos.y, strokeWidth: 3 }
          : { rectWidth: 0, rectHeight: 0, fillColor: 'transparent', borderColor: '#ff0000', borderWidth: 2 }),
      }

      drawingRef.current = { id: newEl.id, startX: pos.x, startY: pos.y }
      setElements((prev) => [...prev, newEl])

      const onMove = (ev: PointerEvent) => {
        const draw = drawingRef.current
        if (!draw) return
        const p = getRelPos(ev)
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== draw.id) return el
            if (el.type === 'line' || el.type === 'arrow') {
              return { ...el, x2: p.x, y2: p.y }
            }
            return {
              ...el,
              x: Math.min(draw.startX, p.x),
              y: Math.min(draw.startY, p.y),
              rectWidth: Math.abs(p.x - draw.startX),
              rectHeight: Math.abs(p.y - draw.startY),
            }
          }),
        )
      }
      const onUp = () => {
        if (drawingRef.current) {
          const id = drawingRef.current.id
          drawingRef.current = null
          setElements((prev) => {
            pushHistory([...prev])
            return prev
          })
          setSelectedId(id)
          setTool('select')
        }
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [tool, elements, getRelPos, pushHistory],
  )

  // ── Update element property ──
  const updateElement = useCallback(
    (id: string, patch: Partial<EditorElement>) => {
      const next = elements.map((el) => (el.id === id ? { ...el, ...patch } : el))
      pushHistory(next)
    },
    [elements, pushHistory],
  )

  // ── Save: composite onto canvas ──
  const handleSave = useCallback(async () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.drawImage(img, 0, 0)

    const displayRect = canvasRef.current?.getBoundingClientRect()
    if (!displayRect) return
    const scaleX = img.naturalWidth / displayRect.width
    const scaleY = img.naturalHeight / displayRect.height

    for (const el of elements) {
      ctx.save()
      if (el.type === 'text') {
        const fs = (el.fontSize || 16) * scaleX
        ctx.font = `${el.fontWeight || 'normal'} ${fs}px sans-serif`
        ctx.fillStyle = el.color
        ctx.textBaseline = 'top'
        if (el.shadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.5)'
          ctx.shadowBlur = 4 * scaleX
          ctx.shadowOffsetX = 2 * scaleX
          ctx.shadowOffsetY = 2 * scaleX
        }
        const lines = (el.text || '').split('\n')
        lines.forEach((line, i) => {
          ctx.fillText(line, el.x * scaleX, el.y * scaleY + i * fs * 1.2)
        })
      } else if (el.type === 'line' || el.type === 'arrow') {
        ctx.strokeStyle = el.color
        ctx.lineWidth = (el.strokeWidth || 3) * scaleX
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(el.x * scaleX, el.y * scaleY)
        ctx.lineTo((el.x2 || el.x) * scaleX, (el.y2 || el.y) * scaleY)
        ctx.stroke()

        if (el.type === 'arrow') {
          const ax = (el.x2 || el.x) * scaleX
          const ay = (el.y2 || el.y) * scaleY
          const bx = el.x * scaleX
          const by = el.y * scaleY
          const angle = Math.atan2(ay - by, ax - bx)
          const headLen = 15 * scaleX
          ctx.fillStyle = el.color
          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.lineTo(ax - headLen * Math.cos(angle - Math.PI / 6), ay - headLen * Math.sin(angle - Math.PI / 6))
          ctx.lineTo(ax - headLen * Math.cos(angle + Math.PI / 6), ay - headLen * Math.sin(angle + Math.PI / 6))
          ctx.closePath()
          ctx.fill()
        }
      } else if (el.type === 'rect') {
        const rx = el.x * scaleX
        const ry = el.y * scaleY
        const rw = (el.rectWidth || 0) * scaleX
        const rh = (el.rectHeight || 0) * scaleY
        if (el.fillColor && el.fillColor !== 'transparent') {
          ctx.fillStyle = el.fillColor
          ctx.fillRect(rx, ry, rw, rh)
        }
        if (el.borderColor && (el.borderWidth || 0) > 0) {
          ctx.strokeStyle = el.borderColor
          ctx.lineWidth = (el.borderWidth || 2) * scaleX
          ctx.strokeRect(rx, ry, rw, rh)
        }
      }
      ctx.restore()
    }

    onSave(canvas.toDataURL('image/webp', 0.85))
    onOpenChange(false)
  }, [src, elements, onSave, onOpenChange])

  // ── Selected element ──
  const selectedEl = elements.find((el) => el.id === selectedId)

  // ── Tool buttons config ──
  const tools: { key: ToolType; icon: typeof MousePointer2; label: string }[] = [
    { key: 'select', icon: MousePointer2, label: 'Select' },
    { key: 'text', icon: Type, label: 'Text' },
    { key: 'line', icon: Minus, label: 'Line' },
    { key: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { key: 'rect', icon: Square, label: 'Rect' },
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-2 bg-zinc-900 border-b border-zinc-700 shrink-0">
        {/* Tool buttons */}
        {tools.map(({ key, icon: Icon, label }) => (
          <Button
            key={key}
            variant={tool === key ? 'default' : 'ghost'}
            size="icon-sm"
            className={cn(
              'text-zinc-300 hover:text-white',
              tool === key && 'bg-primary text-primary-foreground',
            )}
            onClick={() => setTool(key)}
            title={label}
          >
            <Icon className="size-4" />
          </Button>
        ))}

        <div className="w-px h-6 bg-zinc-600 mx-1" />

        {/* Undo / Redo / Delete */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-zinc-300 hover:text-white disabled:opacity-30"
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Undo"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-zinc-300 hover:text-white disabled:opacity-30"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="Redo"
        >
          <Redo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-zinc-300 hover:text-white disabled:opacity-30"
          onClick={deleteSelected}
          disabled={!selectedId}
          title="Delete"
        >
          <Trash2 className="size-4" />
        </Button>

        <div className="flex-1" />

        {/* Save / Close */}
        <Button variant="default" size="sm" className="gap-1.5" onClick={handleSave}>
          <Save className="size-4" />
          <span>{'\uc800\uc7a5'}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-zinc-300 hover:text-white"
          onClick={() => onOpenChange(false)}
          title={'\ub2eb\uae30'}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
        <div
          ref={canvasRef}
          className="relative max-h-[70vh] max-w-full inline-block select-none"
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          onPointerDown={handleCanvasPointerDown}
        >
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="editor background"
            className="block max-h-[70vh] max-w-full object-contain pointer-events-none"
            draggable={false}
          />

          {/* SVG overlay for lines, arrows, rects */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            <defs>
              {/* Dynamic arrowhead markers per element color */}
              {elements.filter(el => el.type === 'arrow').map(el => (
                <marker key={`ah-${el.id}`} id={`arrowhead-${el.id}`} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={el.color} />
                </marker>
              ))}
            </defs>
            {elements
              .filter((el) => el.type === 'line' || el.type === 'arrow' || el.type === 'rect')
              .map((el) => {
                const isSelected = el.id === selectedId
                if (el.type === 'line' || el.type === 'arrow') {
                  return (
                    <g key={el.id} style={{ pointerEvents: 'auto' }}>
                      {/* Hit area (wider invisible stroke for easier clicking) */}
                      <line
                        x1={el.x}
                        y1={el.y}
                        x2={el.x2 || el.x}
                        y2={el.y2 || el.y}
                        stroke="transparent"
                        strokeWidth={Math.max((el.strokeWidth || 3) + 10, 12)}
                        style={{ cursor: 'move' }}
                        onPointerDown={(e) => handleElementPointerDown(e, el.id)}
                      />
                      <line
                        x1={el.x}
                        y1={el.y}
                        x2={el.x2 || el.x}
                        y2={el.y2 || el.y}
                        stroke={el.color}
                        strokeWidth={el.strokeWidth || 3}
                        strokeLinecap="round"
                        markerEnd={el.type === 'arrow' ? `url(#arrowhead-${el.id})` : undefined}
                      />
                      {isSelected && (
                        <line
                          x1={el.x}
                          y1={el.y}
                          x2={el.x2 || el.x}
                          y2={el.y2 || el.y}
                          stroke="#3b82f6"
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          fill="none"
                        />
                      )}
                    </g>
                  )
                }
                // rect
                const rw = el.rectWidth || 0
                const rh = el.rectHeight || 0
                return (
                  <g key={el.id} style={{ pointerEvents: 'auto' }}>
                    <rect
                      x={el.x}
                      y={el.y}
                      width={rw}
                      height={rh}
                      fill={el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'transparent'}
                      stroke={el.borderColor || '#ff0000'}
                      strokeWidth={el.borderWidth || 2}
                      style={{ cursor: 'move' }}
                      onPointerDown={(e) => handleElementPointerDown(e, el.id)}
                    />
                    {isSelected && (
                      <rect
                        x={el.x - 2}
                        y={el.y - 2}
                        width={rw + 4}
                        height={rh + 4}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                      />
                    )}
                  </g>
                )
              })}
          </svg>

          {/* Text elements */}
          {elements
            .filter((el) => el.type === 'text')
            .map((el) => {
              const isSelected = el.id === selectedId
              const isEditing = el.id === editingId
              return (
                <div
                  key={el.id}
                  className={cn(
                    'absolute select-none whitespace-pre-wrap',
                    isSelected && 'ring-2 ring-blue-500 ring-dashed ring-offset-1',
                  )}
                  style={{
                    left: el.x,
                    top: el.y,
                    color: el.color,
                    fontSize: el.fontSize || 16,
                    fontWeight: el.fontWeight || 'normal',
                    textShadow: el.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                    cursor: tool === 'select' ? 'move' : 'crosshair',
                    minWidth: 20,
                    minHeight: 20,
                    lineHeight: 1.2,
                  }}
                  onPointerDown={(e) => handleElementPointerDown(e, el.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    if (tool === 'select') {
                      setSelectedId(el.id)
                      setEditingId(el.id)
                    }
                  }}
                >
                  {isEditing ? (
                    <textarea
                      className="bg-transparent border-none outline-none resize-none text-inherit p-0 m-0"
                      style={{
                        font: 'inherit',
                        color: 'inherit',
                        textShadow: 'inherit',
                        minWidth: 60,
                        minHeight: 30,
                      }}
                      value={el.text || ''}
                      autoFocus
                      onChange={(e) => {
                        setElements((prev) =>
                          prev.map((item) => (item.id === el.id ? { ...item, text: e.target.value } : item)),
                        )
                      }}
                      onBlur={() => {
                        setEditingId(null)
                        pushHistory([...elements])
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Escape') {
                          setEditingId(null)
                          pushHistory([...elements])
                        }
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="pointer-events-none">{el.text || ''}</span>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* ── Bottom properties panel ── */}
      {selectedEl && (
        <div className="shrink-0 bg-zinc-900 border-t border-zinc-700 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 max-w-4xl mx-auto">
            {/* ── Text properties ── */}
            {selectedEl.type === 'text' && (
              <>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{'\ub0b4\uc6a9'}</span>
                  <input
                    type="text"
                    className="bg-zinc-800 text-white text-sm rounded px-2 py-1 border border-zinc-600 w-40"
                    value={selectedEl.text || ''}
                    onChange={(e) => updateElement(selectedEl.id, { text: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{'\ud06c\uae30'}</span>
                  <input
                    type="number"
                    className="bg-zinc-800 text-white text-sm rounded px-2 py-1 border border-zinc-600 w-16"
                    min={12}
                    max={72}
                    value={selectedEl.fontSize || 16}
                    onChange={(e) => updateElement(selectedEl.id, { fontSize: clamp(+e.target.value, 12, 72) })}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{'\uc0c9\uc0c1'}</span>
                  <input
                    type="color"
                    className="w-7 h-7 rounded border border-zinc-600 cursor-pointer bg-transparent p-0"
                    value={selectedEl.color}
                    onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })}
                  />
                </label>
                <Button
                  variant={selectedEl.fontWeight === 'bold' ? 'default' : 'outline'}
                  size="xs"
                  className="text-xs"
                  onClick={() =>
                    updateElement(selectedEl.id, {
                      fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold',
                    })
                  }
                >
                  B
                </Button>
                <Button
                  variant={selectedEl.shadow ? 'default' : 'outline'}
                  size="xs"
                  className="text-xs"
                  onClick={() => updateElement(selectedEl.id, { shadow: !selectedEl.shadow })}
                >
                  {'\uadf8\ub9bc\uc790'}
                </Button>
              </>
            )}

            {/* ── Line / Arrow properties ── */}
            {(selectedEl.type === 'line' || selectedEl.type === 'arrow') && (
              <>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{'\ub450\uaed8'}</span>
                  <input
                    type="number"
                    className="bg-zinc-800 text-white text-sm rounded px-2 py-1 border border-zinc-600 w-16"
                    min={1}
                    max={10}
                    value={selectedEl.strokeWidth || 3}
                    onChange={(e) => updateElement(selectedEl.id, { strokeWidth: clamp(+e.target.value, 1, 10) })}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{'\uc0c9\uc0c1'}</span>
                  <input
                    type="color"
                    className="w-7 h-7 rounded border border-zinc-600 cursor-pointer bg-transparent p-0"
                    value={selectedEl.color}
                    onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })}
                  />
                </label>
              </>
            )}

            {/* ── Rect properties ── */}
            {selectedEl.type === 'rect' && (
              <>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{'\ucc44\uc6b0\uae30'}</span>
                  <input
                    type="color"
                    className="w-7 h-7 rounded border border-zinc-600 cursor-pointer bg-transparent p-0"
                    value={selectedEl.fillColor === 'transparent' ? '#000000' : selectedEl.fillColor || '#000000'}
                    onChange={(e) => updateElement(selectedEl.id, { fillColor: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-xs text-zinc-400"
                    onClick={() => updateElement(selectedEl.id, { fillColor: 'transparent' })}
                  >
                    {'\uc5c6\uc74c'}
                  </Button>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{'\ud14c\ub450\ub9ac'}</span>
                  <input
                    type="color"
                    className="w-7 h-7 rounded border border-zinc-600 cursor-pointer bg-transparent p-0"
                    value={selectedEl.borderColor || '#ff0000'}
                    onChange={(e) => updateElement(selectedEl.id, { borderColor: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{'\ub450\uaed8'}</span>
                  <input
                    type="number"
                    className="bg-zinc-800 text-white text-sm rounded px-2 py-1 border border-zinc-600 w-16"
                    min={0}
                    max={20}
                    value={selectedEl.borderWidth || 2}
                    onChange={(e) => updateElement(selectedEl.id, { borderWidth: clamp(+e.target.value, 0, 20) })}
                  />
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
