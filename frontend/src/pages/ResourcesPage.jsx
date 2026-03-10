import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card } from "../components/Cards";
import { MarkdownContent } from "../components/MarkdownContent";

export function ResourcesPage() {
  const [resources, setResources] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getResources().then(setResources).catch((nextError) => setError(nextError.message));
  }, []);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (!resources) {
    return <div className="empty-state">Loading resources...</div>;
  }

  return (
    <div className="page-grid">
      <section className="page-header">
        <span className="eyebrow">Resources</span>
        <h1>Publisher materials</h1>
        <p>Default PX content and publisher-specific guidance live here.</p>
      </section>
      <Card title="Resources">
        <MarkdownContent content={resources.content_markdown} />
      </Card>
    </div>
  );
}
