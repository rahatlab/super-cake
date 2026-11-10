import Link from "next/link";
import { Fragment } from "react";

/**
 * Minimal, dependency-free markdown renderer for blog posts.
 * Supports: ## heading, - list item, **bold**, *italic*, blank-line paragraphs.
 * Everything else is rendered as plain text (safe by default — no HTML parsing).
 */
export function Markdown({ content }: { content: string }) {
  // Windows-authored posts arrive with CRLF — without normalising, the block
  // split never fires and the whole post renders as a single giant heading.
  const blocks = content
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/);

  return (
    <div className="prose-bn">
      {blocks.map((raw, i) => {
        const lines = raw
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (!lines.length) return null;

        const parts: React.ReactNode[] = [];
        let rest = lines;

        const head = lines[0].match(/^(#{1,3}) (.+)$/);
        if (head) {
          const Heading = head[1].length === 3 ? "h3" : "h2";
          parts.push(<Heading key="h">{head[2]}</Heading>);
          rest = lines.slice(1);
        }

        if (rest.length) {
          const ordered = rest.every((l) => /^\d+[.)]\s/.test(l));
          const bulleted = rest.every((l) => /^[-*•]\s/.test(l));
          if (ordered || bulleted) {
            const List = ordered ? "ol" : "ul";
            parts.push(
              <List key="l">
                {rest.map((l, j) => (
                  <li key={j}>{inline(l.replace(/^([-*•]|\d+[.)])\s/, ""))}</li>
                ))}
              </List>,
            );
          } else {
            parts.push(
              <p key="p">
                {rest.map((l, j) => (
                  <span key={j}>{inline(l)}{" "}</span>
                ))}
              </p>,
            );
          }
        }

        return <Fragment key={i}>{parts}</Fragment>;
      })}
    </div>
  );
}

/** Handles **bold** and *italic* inline markers. */
function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function ReadingTime({ text }: { text: string }) {
  const words = text.replace(/[#*-]/g, " ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return <span>~{minutes} মিনিট পড়া</span>;
}

export function BlogLink({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <Link href={`/blog/${slug}`} className="text-brand-strong underline decoration-dotted">
      {children}
    </Link>
  );
}
