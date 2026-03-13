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
  const lines = content.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={`heading-${index}`} className="text-lg font-semibold text-px-ink">
          {line.replace("## ", "")}
        </h3>
      );
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      const listStartIndex = index;

      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().replace("- ", ""));
        index += 1;
      }

      blocks.push(
        <ul key={`list-${listStartIndex}`} className="space-y-3">
          {items.map((item, itemIndex) => (
            <li key={`item-${listStartIndex}-${itemIndex}`} className="flex gap-3 text-black/80">
              <span className="mt-[0.72rem] h-2 w-2 rounded-full bg-px-green/70" />
              <span className="flex-1">{renderInline(item, `list-${listStartIndex}-${itemIndex}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    const paragraphLines = [];
    const paragraphStartIndex = index;

    while (index < lines.length) {
      const currentLine = lines[index].trim();
      if (!currentLine || currentLine.startsWith("## ") || currentLine.startsWith("- ")) {
        break;
      }
      paragraphLines.push(currentLine);
      index += 1;
    }

    blocks.push(
      <p key={`paragraph-${paragraphStartIndex}`} className="text-black/75">
        {renderInline(paragraphLines.join(" "), `line-${paragraphStartIndex}`)}
      </p>
    );
  }

  return <div className="space-y-5 text-[15px] leading-7">{blocks}</div>;
}
