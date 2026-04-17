export const ALL_LESSON_TYPES_KEY = "__all__";

export type FilterableSlot = {
  lessonType?: string;
  lessonTypeCustom?: string | null;
};

export type FilterableProduct = {
  teacherLessonType?: string | null;
  teacherLessonTypeCustom?: string | null;
};

function normalizeCustom(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * True when a preset availability slot should remain visible for the currently
 * selected lesson product. Missing lesson-type metadata on either side falls
 * back to showing the slot (e.g. legacy data, or a product without a specific
 * teacher lesson type association).
 */
export function slotMatchesProduct(
  slot: FilterableSlot,
  product: FilterableProduct,
): boolean {
  if (!slot.lessonType || !product.teacherLessonType) return true;
  if (slot.lessonType !== product.teacherLessonType) return false;
  if (slot.lessonType !== "custom") return true;
  return (
    normalizeCustom(slot.lessonTypeCustom) ===
    normalizeCustom(product.teacherLessonTypeCustom)
  );
}

/** Filter a preset list for the given selection; "All" / undefined returns all. */
export function filterSlotsForSelection<Slot extends FilterableSlot>(
  slots: Slot[],
  selectedProduct: FilterableProduct | undefined,
): Slot[] {
  if (!selectedProduct) return slots;
  return slots.filter((s) => slotMatchesProduct(s, selectedProduct));
}
