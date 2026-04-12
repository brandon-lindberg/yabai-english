"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";

const Editor = dynamic(
  () =>
    import("./student-bio-mdx-editor-inner").then((m) => m.StudentBioMdxEditorInner),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] rounded-xl border border-border bg-foreground/5 px-3 py-4 text-sm text-muted">
        Loading editor…
      </div>
    ),
  },
);

export type StudentBioMdxEditorProps = Omit<MDXEditorProps, "plugins" | "ref"> & {
  maxPlainTextLength?: number;
};

export const StudentBioMdxEditor = forwardRef<MDXEditorMethods, StudentBioMdxEditorProps>(
  (props, ref) => <Editor {...props} editorRef={ref} />,
);

StudentBioMdxEditor.displayName = "StudentBioMdxEditor";
