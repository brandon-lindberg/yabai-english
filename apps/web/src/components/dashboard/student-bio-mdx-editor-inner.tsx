"use client";

import "@mdxeditor/editor/style.css";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  maxLengthPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  toolbarPlugin,
  UndoRedo,
  ListsToggle,
  type MDXEditorMethods,
  type MDXEditorProps,
} from "@mdxeditor/editor";
import { useMemo } from "react";

type Props = {
  editorRef: React.Ref<MDXEditorMethods> | null;
  /** Caps visible text in the editor (Lexical); markdown is still clipped to DB max in the parent. */
  maxPlainTextLength?: number;
} & Omit<MDXEditorProps, "plugins" | "ref">;

export function StudentBioMdxEditorInner({ editorRef, maxPlainTextLength, ...props }: Props) {
  const plugins = useMemo(() => {
    const rest = [
      headingsPlugin({ allowedHeadingLevels: [2, 3] }),
      listsPlugin(),
      quotePlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <Separator />
            <BoldItalicUnderlineToggles />
            <Separator />
            <ListsToggle />
            <Separator />
            <CreateLink />
            <Separator />
            <BlockTypeSelect />
          </>
        ),
      }),
    ];
    if (typeof maxPlainTextLength === "number" && maxPlainTextLength > 0) {
      rest.push(maxLengthPlugin(maxPlainTextLength));
    }
    return rest;
  }, [maxPlainTextLength]);

  return <MDXEditor ref={editorRef} {...props} plugins={plugins} />;
}
