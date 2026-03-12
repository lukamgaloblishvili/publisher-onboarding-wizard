import { useEffect, useState } from "react";
import { Card } from "../components/Cards";
import { MarkdownContent } from "../components/MarkdownContent";
import { usePortalStore } from "../stores/usePortalStore";

export function ResourcesPage() {
  const resources = usePortalStore((state) => state.resources);
  const loadResources = usePortalStore((state) => state.loadResources);
  const [error, setError] = useState("");

  useEffect(() => {
    loadResources().catch((nextError) => setError(nextError.message));
  }, [loadResources]);

  if (error) {
    return <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }

  if (!resources) {
    return <div className="app-card text-sm text-black/60">Loading resources...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <span className="text-xs uppercase tracking-[0.2em] text-px-deep">Resources</span>
        <h1 className="text-4xl font-semibold text-px-ink">Campaign onboarding materials</h1>
        <p className="max-w-3xl text-base leading-7 text-black/65">
          Everything here supports launch readiness for new campaigns. This page complements open.px.com instead of replacing it.
        </p>
      </section>
      <Card title="Resources">
        <MarkdownContent content={resources.content_markdown} />
      </Card>
    </div>
  );
}
