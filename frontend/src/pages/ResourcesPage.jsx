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
      <section className="rounded-[2rem] border border-px-green/10 bg-white/70 px-6 py-6 shadow-[0_18px_40px_rgba(19,116,62,0.06)] sm:px-8">
        <div className="space-y-4">
          <span className="text-xs uppercase tracking-[0.2em] text-px-deep">Resources</span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold text-px-ink">Campaign onboarding materials</h1>
            <p className="max-w-3xl text-base leading-7 text-black/65">
              Everything here supports launch readiness for new campaigns. This page complements open.px.com instead of replacing it.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-black/60">
            <span className="rounded-full bg-px-mist px-4 py-2">Launch guides</span>
            <span className="rounded-full bg-px-mist px-4 py-2">Compliance notes</span>
            <span className="rounded-full bg-px-mist px-4 py-2">Shared references</span>
          </div>
        </div>
      </section>
      <Card title="Resources Library" className="overflow-hidden">
        <div className="rounded-[1.5rem] bg-px-mist/45 px-5 py-5 sm:px-6">
          <MarkdownContent content={resources.content_markdown} />
        </div>
      </Card>
    </div>
  );
}
