"use client";

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

function SortableChip({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
  };
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className="touch-none rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
      {...attributes}
      {...listeners}
    >
      {label}
    </button>
  );
}

export function StudyReorderExercise({
  tokens,
  disabled,
  onCheck,
}: {
  tokens: { id: string; text: string }[];
  disabled: boolean;
  onCheck: (orderedIds: string[]) => void;
}) {
  const t = useTranslations("study");
  const [orderedIds, setOrderedIds] = useState<string[]>(() => tokens.map((x) => x.id));

  const idToText = useMemo(() => new Map(tokens.map((x) => [x.id, x.text])), [tokens]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrderedIds((ids) => {
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return ids;
      return arrayMove(ids, oldIndex, newIndex);
    });
  };

  const preview = orderedIds.map((id) => idToText.get(id) ?? "").join(" ");

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-2">
            {orderedIds.map((id) => (
              <SortableChip key={id} id={id} label={idToText.get(id) ?? id} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <p className="text-xs text-muted">{t("reorderPreviewLabel")}</p>
      <p className="rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm text-foreground">{preview}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onCheck(orderedIds)}
        className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
      >
        {t("reorderCheck")}
      </button>
    </div>
  );
}
