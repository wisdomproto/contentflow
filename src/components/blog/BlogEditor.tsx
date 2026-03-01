'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useContentStore } from '@/stores/useContentStore';
import { TitleEditor } from './TitleEditor';
import { Section } from './Section';
import { AddSectionButton } from './AddSectionButton';
import type { BlogSection } from '@/types/content';
import { toast } from '@/components/ui/Toast';

function SortableSection({
  section,
  contentId,
}: {
  section: BlogSection;
  contentId: string;
}) {
  const updateSection = useContentStore((s) => s.updateSection);
  const deleteSection = useContentStore((s) => s.deleteSection);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = () => {
    deleteSection(contentId, section.id);
    toast('섹션이 삭제되었습니다', 'info', {
      label: '되돌리기',
      onClick: () => {
        // TODO: implement undo
      },
    });
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Section
        section={section}
        onUpdate={(data) => updateSection(contentId, section.id, data)}
        onDelete={handleDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function BlogEditor() {
  const activeContentId = useContentStore((s) => s.activeContentId);
  const contents = useContentStore((s) => s.contents);
  const updateBlogTitle = useContentStore((s) => s.updateBlogTitle);
  const addSection = useContentStore((s) => s.addSection);
  const reorderSections = useContentStore((s) => s.reorderSections);

  const content = activeContentId ? contents[activeContentId] : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!content) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = content.blog.sections.findIndex((s) => s.id === active.id);
      const newIndex = content.blog.sections.findIndex((s) => s.id === over.id);
      const newOrder = [...content.blog.sections];
      const [moved] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, moved);
      reorderSections(content.id, newOrder.map((s) => s.id));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <TitleEditor
        title={content.blog.title}
        onChange={(title) => updateBlogTitle(content.id, title)}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={content.blog.sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {content.blog.sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                contentId={content.id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AddSectionButton onClick={() => addSection(content.id)} />
    </div>
  );
}
