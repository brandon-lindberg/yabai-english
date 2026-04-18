import Markdown from "react-markdown";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  h1: ({ children, ...rest }) => (
    <h1 className="mt-0 text-2xl font-semibold tracking-tight text-foreground" {...rest}>
      {children}
    </h1>
  ),
  h2: ({ children, ...rest }) => (
    <h2 className="mt-10 scroll-mt-24 text-lg font-semibold text-foreground" {...rest}>
      {children}
    </h2>
  ),
  h3: ({ children, ...rest }) => (
    <h3 className="mt-6 text-base font-semibold text-foreground" {...rest}>
      {children}
    </h3>
  ),
  p: ({ children, ...rest }) => (
    <p className="mt-3 text-sm leading-relaxed text-foreground" {...rest}>
      {children}
    </p>
  ),
  ul: ({ children, ...rest }) => (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground" {...rest}>
      {children}
    </ul>
  ),
  ol: ({ children, ...rest }) => (
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground" {...rest}>
      {children}
    </ol>
  ),
  li: ({ children, ...rest }) => <li {...rest}>{children}</li>,
  a: ({ children, href, ...rest }) => (
    <a
      href={href}
      className="font-medium text-link underline-offset-4 hover:underline"
      rel="noopener noreferrer"
      target={href?.startsWith("http") ? "_blank" : undefined}
      {...rest}
    >
      {children}
    </a>
  ),
  strong: ({ children, ...rest }) => (
    <strong className="font-semibold text-foreground" {...rest}>
      {children}
    </strong>
  ),
  hr: (props) => <hr className="my-8 border-border" {...props} />,
};

export function LegalDocument({ markdown }: { markdown: string }) {
  return (
    <article className="legal-markdown max-w-3xl">
      <Markdown components={markdownComponents}>{markdown}</Markdown>
    </article>
  );
}
