import {
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback } from 'react';

/**
 * Shared drag-and-drop reorder logic used by BlogEditor and CardNewsEditor.
 */
export function useDragReorder(
  items: { id: string }[],
  onReorder: (newIds: string[]) => void,
) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((s) => s.id === active.id);
        const newIndex = items.findIndex((s) => s.id === over.id);
        const newOrder = [...items];
        const [moved] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, moved);
        onReorder(newOrder.map((s) => s.id));
      }
    },
    [items, onReorder],
  );

  return { sensors, handleDragEnd, closestCenter };
}
