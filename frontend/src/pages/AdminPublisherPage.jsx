import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/Cards";
import { StatusPill } from "../components/StatusPill";
import { usePortalStore } from "../stores/usePortalStore";

export function AdminPublisherPage() {
  const { publisherId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const adminPublisher = usePortalStore((state) => state.adminPublisher);
  const latestAccessCode = usePortalStore((state) => state.latestAccessCode);
  const loadAdminPublisher = usePortalStore((state) => state.loadAdminPublisher);
  const updatePublisher = usePortalStore((state) => state.updatePublisher);
  const resetPublisherAccessCode = usePortalStore((state) => state.resetPublisherAccessCode);
  const deletePublisher = usePortalStore((state) => state.deletePublisher);
  const createCampaign = usePortalStore((state) => state.createCampaign);
  const deleteCampaign = usePortalStore((state) => state.deleteCampaign);
  const [publisherForm, setPublisherForm] = useState(null);
  const [campaignForm, setCampaignForm] = useState({ name: "", status: "in_progress" });
  const [emailDraft, setEmailDraft] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAdminPublisher(publisherId)
      .then((publisher) =>
        setPublisherForm({
          name: publisher.name,
          slug: publisher.slug,
          slack_channel_embed_url: publisher.slack_channel_embed_url || "",
          notification_emails: publisher.notification_emails,
          resources_content_markdown: publisher.resources_content_markdown || ""
        })
      )
      .catch((nextError) => setError(nextError.message));
  }, [loadAdminPublisher, publisherId]);

  if (error) {
    return <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }

  if (!adminPublisher || !publisherForm) {
    return <div className="app-card text-sm text-black/60">Loading publisher...</div>;
  }

  const visibleAccessCode = latestAccessCode || location.state?.accessCode || "";

  function addNotificationEmail() {
    const nextEmail = emailDraft.trim().toLowerCase();
    if (!nextEmail || publisherForm.notification_emails.includes(nextEmail)) {
      setEmailDraft("");
      return;
    }
    setPublisherForm((current) => ({
      ...current,
      notification_emails: [...current.notification_emails, nextEmail]
    }));
    setEmailDraft("");
  }

  function removeNotificationEmail(emailToRemove) {
    setPublisherForm((current) => ({
      ...current,
      notification_emails: current.notification_emails.filter((email) => email !== emailToRemove)
    }));
  }

  async function copyAccessCode() {
    if (!visibleAccessCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(visibleAccessCode);
      setCopyFeedback("Access code copied");
      window.setTimeout(() => setCopyFeedback(""), 2000);
    } catch {
      setCopyFeedback("Copy failed");
      window.setTimeout(() => setCopyFeedback(""), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <span className="text-xs uppercase tracking-[0.2em] text-px-deep">Publisher Admin</span>
        <h1 className="text-4xl font-semibold text-px-ink">{adminPublisher.name}</h1>
        <p className="max-w-3xl text-base leading-7 text-black/65">
          Manage the onboarding workspace, notification recipients, shared Slack channel, and publisher access code for upcoming campaigns.
        </p>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Publisher settings">
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                const publisher = await updatePublisher(adminPublisher.id, publisherForm);
                setPublisherForm({
                  name: publisher.name,
                  slug: publisher.slug,
                  slack_channel_embed_url: publisher.slack_channel_embed_url || "",
                  notification_emails: publisher.notification_emails,
                  resources_content_markdown: publisher.resources_content_markdown || ""
                });
              } catch (nextError) {
                setError(nextError.message);
              }
            }}
          >
            <label className="app-label">
              Publisher name
              <input className="app-input" value={publisherForm.name} onChange={(event) => setPublisherForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="app-label">
              Slug
              <input className="app-input" value={publisherForm.slug} onChange={(event) => setPublisherForm((current) => ({ ...current, slug: event.target.value }))} />
            </label>
            <label className="app-label">
              Shared Slack channel URL
              <input
                className="app-input"
                placeholder="https://workspace.slack.com/archives/CHANNEL_ID"
                value={publisherForm.slack_channel_embed_url}
                onChange={(event) => setPublisherForm((current) => ({ ...current, slack_channel_embed_url: event.target.value }))}
              />
            </label>
            <p className="app-helper">Use the exact Slack channel URL copied from Slack so publishers open the dedicated onboarding channel directly.</p>
            <div className="space-y-3">
              <label className="app-label">Notification emails</label>
              <div className="rounded-[1.4rem] border border-black/10 bg-white/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    className="app-input"
                    placeholder="name@publisher.com"
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addNotificationEmail();
                      }
                    }}
                  />
                  <button type="button" className="app-button-secondary sm:self-start" onClick={addNotificationEmail}>
                    Add email
                  </button>
                </div>
                <p className="app-helper mt-3">Recipients are active by default today. Later this can expand into enable or disable notification controls per contact.</p>
                {publisherForm.notification_emails.length ? (
                  <div className="mt-4 space-y-3">
                    {publisherForm.notification_emails.map((email) => (
                      <div key={email} className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-px-mist/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <strong className="block text-sm font-medium text-px-ink">{email}</strong>
                          <span className="app-pill bg-px-green/10 text-px-deep">Active</span>
                        </div>
                        <button type="button" className="app-button-link" onClick={() => removeNotificationEmail(email)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-px-mist/60 px-4 py-4 text-sm text-black/60">No notification recipients configured yet.</div>
                )}
              </div>
            </div>
            <label className="app-label">
              Resources markdown
              <textarea
                className="app-input min-h-40"
                rows="8"
                value={publisherForm.resources_content_markdown}
                onChange={(event) => setPublisherForm((current) => ({ ...current, resources_content_markdown: event.target.value }))}
              />
            </label>
            <button className="app-button-primary">Save publisher</button>
            <button
              type="button"
              className="app-button-link"
              onClick={async () => {
                if (!window.confirm(`Delete publisher "${adminPublisher.name}" and all related campaigns?`)) {
                  return;
                }
                await deletePublisher(adminPublisher.id);
                navigate("/admin");
              }}
            >
              Delete publisher
            </button>
          </form>
        </Card>
        <Card title="Publisher access">
          <div className="space-y-4">
            <div className="rounded-[1.4rem] border border-px-green/20 bg-px-mist/70 p-5">
              <p className="text-sm leading-7 text-black/70">
                Publishers now use one shared access code per publisher workspace. Rotate it whenever access needs to be refreshed.
              </p>
              {visibleAccessCode ? (
                <div className="mt-4 rounded-2xl bg-white px-4 py-4">
                  <span className="block text-xs uppercase tracking-[0.2em] text-black/45">Current access code</span>
                  <strong className="mt-2 block text-lg font-semibold text-px-ink">{visibleAccessCode}</strong>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className="app-button-secondary" onClick={copyAccessCode}>
                      Copy access code
                    </button>
                    {copyFeedback ? <span className="text-sm text-black/60">{copyFeedback}</span> : null}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-sm text-black/60">
                  The existing access code is stored securely and cannot be viewed again. Generate a new one if you need to share it.
                </div>
              )}
              <button
                className="app-button-secondary mt-4"
                onClick={async () => {
                  try {
                    await resetPublisherAccessCode(adminPublisher.id);
                  } catch (nextError) {
                    setError(nextError.message);
                  }
                }}
              >
                Generate new access code
              </button>
            </div>
            <div className="rounded-[1.4rem] border border-black/10 bg-white/80 p-5 text-sm leading-7 text-black/70">
              <strong className="block text-px-ink">Notification recipients</strong>
              {adminPublisher.notification_emails.length ? (
                <ul className="mt-3 space-y-2">
                  {adminPublisher.notification_emails.map((email) => (
                    <li key={email}>{email}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3">No notification emails configured yet.</p>
              )}
            </div>
          </div>
        </Card>
        <Card title="Create campaign" className="xl:col-span-2">
          <form
            className="grid gap-4 lg:grid-cols-[1fr_220px_auto]"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await createCampaign(adminPublisher.id, campaignForm);
                setCampaignForm({ name: "", status: "in_progress" });
                await loadAdminPublisher(publisherId);
              } catch (nextError) {
                setError(nextError.message);
              }
            }}
          >
            <input className="app-input" placeholder="Campaign name" value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} />
            <select className="app-input" value={campaignForm.status} onChange={(event) => setCampaignForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_on_publisher">Waiting on Publisher</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
            <button className="app-button-primary">Add campaign</button>
          </form>
        </Card>
        <Card title="Campaigns" className="xl:col-span-2">
          <div className="space-y-3">
            {adminPublisher.campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-4 rounded-3xl border border-black/10 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Link className="text-base font-semibold text-px-ink underline-offset-2 hover:underline" to={`/campaigns/${campaign.id}`}>
                    {campaign.name}
                  </Link>
                  <p className="mt-1 text-sm text-black/60">
                    Integration {campaign.integration?.external_ticket_key || "unlinked"} - Compliance {campaign.compliance?.external_item_id || "unlinked"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={campaign.status} />
                  <button
                    type="button"
                    className="app-button-link"
                    onClick={async () => {
                      if (!window.confirm(`Delete campaign "${campaign.name}"?`)) {
                        return;
                      }
                      await deleteCampaign(campaign.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
