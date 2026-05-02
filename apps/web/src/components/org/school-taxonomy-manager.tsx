"use client";

import { TaxonomyManager } from "@/components/taxonomy/taxonomy-manager";

type Props = { orgId: string; schoolId: string };

export function SchoolTaxonomyManager({ orgId, schoolId }: Props) {
  return (
    <TaxonomyManager
      namespace="org.school.taxonomyPage"
      levelsEndpoint={`/api/org/${orgId}/schools/${schoolId}/class-levels`}
      typesEndpoint={`/api/org/${orgId}/schools/${schoolId}/class-types`}
    />
  );
}
