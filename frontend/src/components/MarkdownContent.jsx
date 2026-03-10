function renderInline(text) {
  const match = text.match(/\[(.+?)\]\((.+?)\)/);
  if (!match) {
    return text;
  }
  const [full, label, href] = match;
  const [before, after] = text.split(full);
  return (
    <>
      {before}
      <a href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
      {after}
    </>
  );
}

export function MarkdownContent({ content }) {
  return (
    <div className="markdown">
      {content.split("\n").map((line, index) => {
        if (!line.trim()) {
          return <div key={index} className="markdown-spacer" />;
        }
        if (line.startsWith("## ")) {
          return <h3 key={index}>{line.replace("## ", "")}</h3>;
        }
        if (line.startsWith("- ")) {
          return (
            <p key={index} className="markdown-list-item">
              {renderInline(line.replace("- ", ""))}
            </p>
          );
        }
        return <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
