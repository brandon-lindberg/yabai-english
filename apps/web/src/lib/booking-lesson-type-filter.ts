export const ALL_LESSON_TYPES_KEY = "__all__";

export type FilterableSlot = {
  classTypeId?: string | null;
};

export type FilterableProduct = {
  teacherClassTypeId?: string | null;
};

/**
 * True when a preset availability slot should remain visible for the currently
 * selected lesson product. Missing class-type metadata on either side falls
 * back to showing the slot (e.g. catalog product without a specific teacher
 * class-type association).
 */
export function slotMatchesProduct(
  slot: FilterableSlot,
  product: FilterableProduct,
): boolean {
  if (!slot.classTypeId || !product.teacherClassTypeId) return true;
  return slot.classTypeId === product.teacherClassTypeId;
}

/** Filter a preset list for the given selection; "All" / undefined returns all. */
export function filterSlotsForSelection<Slot extends FilterableSlot>(
  slots: Slot[],
  selectedProduct: FilterableProduct | undefined,
): Slot[] {
  if (!selectedProduct) return slots;
  return slots.filter((s) => slotMatchesProduct(s, selectedProduct));
}
