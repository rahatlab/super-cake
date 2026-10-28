import Link from "next/link";

/**
 * Minimal, dependency-free markdown renderer for blog posts.
 * Supports: ## heading, - list item, **bold**, *italic*, blank-line paragraphs.
 * Everything else is rendered as plain text (safe by default — no HTML parsing).
 */
export function Markdown({ content }: { content: string }) {
  const blocks = content.replace(/\\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="prose-bn">
      {blocks.map((raw, i) => {
        const block = raw.trim();
        if (!block) return null;

        if (block.startsWith("## ")) {
          return <h2 key={i}>{block.slice(3)}</h2>;
        }

        if (block.startsWith("# ")) {
          return <h2 key={i}>{block.slice(2)}</h2>;
        }

        const lines = block.split("\n").filter(Boolean);
        const isList = lines.every((l) => /^[-*•]\s/.test(l.trim()) || /^\d+[.)]\s/.test(l.trim()));

        if (isList) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().replace(/^([-*•]|\d+[.)])\s/, ""))}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{lines.map((l, j) => <span key={j}>{inline(l)}{" "}</span>)}</p>;
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
