"use client";

import { TaxonomyManager } from "@/components/taxonomy/taxonomy-manager";

export function TeacherTaxonomyManager() {
  return (
    <TaxonomyManager
      namespace="dashboard.taxonomyPage"
      levelsEndpoint="/api/teacher/class-levels"
      typesEndpoint="/api/teacher/class-types"
    />
  );
}
