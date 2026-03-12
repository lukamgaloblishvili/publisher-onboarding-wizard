import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/Cards";
import { DEFAULT_RESOURCES_MARKDOWN } from "../constants";
import { usePortalStore } from "../stores/usePortalStore";

const emptyPublisher = {
  name: "",
  slug: "",
  slack_channel_embed_url: "",
  notification_emails: [""],
  resources_content_markdown: DEFAULT_RESOURCES_MARKDOWN
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const adminPublishers = usePortalStore((state) => state.adminPublishers);
  const loadAdminPublishers = usePortalStore((state) => state.loadAdminPublishers);
  const createPublisher = usePortalStore((state) => state.createPublisher);
  const [form, setForm] = useState(emptyPublisher);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAdminPublishers().catch((nextError) => setError(nextError.message));
  }, [loadAdminPublishers]);

  async function handleCreate(event) {
    event.preventDefault();
    try {
      const result = await createPublisher({
        ...form,
        notification_emails: form.notification_emails.filter(Boolean)
      });
      setForm(emptyPublisher);
      navigate(`/admin/publishers/${result.publisher.id}`, { state: { accessCode: result.access_code } });
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <span className="text-xs uppercase tracking-[0.2em] text-px-deep">Admin</span>
        <h1 className="text-4xl font-semibold text-px-ink">Publisher onboarding workspaces</h1>
        <p className="max-w-3xl text-base leading-7 text-black/65">
          Set up publisher onboarding for new campaigns, centralize integration and compliance work, and keep the launch process moving quickly without
          replacing open.px.com.
        </p>
      </section>
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card title="Publishers">
          <div className="space-y-3">
            {adminPublishers.map((publisher) => (
              <Link key={publisher.id} to={`/admin/publishers/${publisher.id}`} className="flex items-center justify-between rounded-3xl border border-black/10 px-4 py-4 transition hover:border-px-green/30 hover:bg-px-mist/50">
                <div>
                  <strong className="block text-sm font-semibold text-px-ink">{publisher.name}</strong>
                  <span className="text-sm text-black/60">
                    {publisher.campaigns.length} campaigns • {publisher.notification_emails.length} notification emails • {publisher.has_access_code ? "access code ready" : "access code missing"}
                  </span>
                </div>
                <span className="text-sm font-medium text-px-deep">Manage</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card title="Create publisher">
          <form className="space-y-4" onSubmit={handleCreate}>
            <label className="app-label">
              Publisher name
              <input className="app-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="app-label">
              Slug
              <input className="app-input" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
            </label>
            <label className="app-label">
              Shared Slack channel URL
              <input
                className="app-input"
                placeholder="https://workspace.slack.com/archives/CHANNEL_ID"
                value={form.slack_channel_embed_url}
                onChange={(event) => setForm((current) => ({ ...current, slack_channel_embed_url: event.target.value }))}
              />
            </label>
            <p className="app-helper">Paste the direct Slack link for the shared publisher channel so the publisher lands in the correct conversation.</p>
            <label className="app-label">
              Notification emails
              <textarea
                className="app-input min-h-28"
                rows="4"
                placeholder="one@email.com&#10;another@email.com"
                value={form.notification_emails.join("\n")}
                onChange={(event) => setForm((current) => ({ ...current, notification_emails: event.target.value.split("\n") }))}
              />
            </label>
            <p className="app-helper">These emails are stored now for future notification support. One email per line.</p>
            <label className="app-label">
              Resources markdown
              <textarea
                className="app-input min-h-40"
                rows="8"
                value={form.resources_content_markdown}
                onChange={(event) => setForm((current) => ({ ...current, resources_content_markdown: event.target.value }))}
              />
            </label>
            <button className="app-button-primary w-full">Create publisher and access code</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
