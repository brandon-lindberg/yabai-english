"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";

const Editor = dynamic(
  () =>
    import("./markdown-editor-inner").then((m) => m.MarkdownEditorInner),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] rounded-xl border border-border bg-foreground/5 px-3 py-4 text-sm text-muted">
        Loading editor…
      </div>
    ),
  },
);

export type MarkdownEditorProps = Omit<MDXEditorProps, "plugins" | "ref"> & {
  maxPlainTextLength?: number;
};

export const MarkdownEditor = forwardRef<MDXEditorMethods, MarkdownEditorProps>(
  (props, ref) => <Editor {...props} editorRef={ref} />,
);

MarkdownEditor.displayName = "MarkdownEditor";
