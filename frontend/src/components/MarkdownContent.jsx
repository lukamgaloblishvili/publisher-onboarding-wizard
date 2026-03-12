function renderInline(text, keyPrefix) {
  const parts = [];
  let remaining = text;
  let index = 0;

  while (remaining.length) {
    const match = remaining.match(/\[(.+?)\]\((.+?)\)/);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }
    const [full, label, href] = match;
    const before = remaining.slice(0, match.index);
    if (before) {
      parts.push(before);
    }
    parts.push(
      <a key={`${keyPrefix}-${index}`} className="font-semibold text-px-deep underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
    remaining = remaining.slice(match.index + full.length);
    index += 1;
  }

  return parts;
}

export function MarkdownContent({ content }) {
  return (
    <div className="space-y-3 text-sm leading-7 text-black/80">
      {content.split("\n").map((line, index) => {
        if (!line.trim()) {
          return <div key={index} className="h-2" />;
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={index} className="pt-2 text-base font-semibold text-px-ink">
              {line.replace("## ", "")}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={index} className="pl-4">
              • {renderInline(line.replace("- ", ""), `list-${index}`)}
            </p>
          );
        }
        return <p key={index}>{renderInline(line, `line-${index}`)}</p>;
      })}
    </div>
  );
}
