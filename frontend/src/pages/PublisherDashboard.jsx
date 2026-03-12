import { Link } from "react-router-dom";
import { Card } from "../components/Cards";
import { StatusPill } from "../components/StatusPill";

export function PublisherDashboard({ publisher }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <span className="text-xs uppercase tracking-[0.2em] text-px-deep">Publisher Workspace</span>
        <h1 className="text-4xl font-semibold text-px-ink">{publisher.name}</h1>
        <p className="max-w-3xl text-base leading-7 text-black/65">
          Use this workspace to onboard new campaigns, keep integration and compliance centralized, and move from setup to go-live quickly. This does not
          replace open.px.com.
        </p>
      </section>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Campaigns" className="xl:col-span-2">
          <div className="space-y-3">
            {publisher.campaigns.map((campaign) => (
              <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="flex flex-col gap-4 rounded-3xl border border-black/10 px-4 py-4 transition hover:border-px-green/30 hover:bg-px-mist/40 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <strong className="block text-sm font-semibold text-px-ink">{campaign.name}</strong>
                  <span className="text-sm text-black/60">
                    Integration: {campaign.integration?.external_ticket_key || "Not linked"} • Compliance: {campaign.compliance?.external_item_id || "Not linked"}
                  </span>
                </div>
                <StatusPill status={campaign.status} />
              </Link>
            ))}
          </div>
        </Card>
        <Card title="Shared Slack">
          {publisher.slack_channel_embed_url ? (
            <div className="space-y-4">
              <p className="text-sm leading-7 text-black/70">Use this dedicated shared Slack channel to coordinate onboarding questions with your PX team.</p>
              <a className="app-button-primary" href={publisher.slack_channel_embed_url} target="_blank" rel="noreferrer">
                Open Slack Channel
              </a>
            </div>
          ) : (
            <div className="rounded-2xl bg-px-mist/70 px-4 py-4 text-sm text-black/60">Slack has not been configured yet.</div>
          )}
        </Card>
        <Card title="Resources" className="xl:col-span-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-3xl text-sm leading-7 text-black/70">
              Reference onboarding guides, compliance instructions, and campaign launch notes without bouncing between tools.
            </p>
            <Link className="app-button-secondary" to="/resources">
              View resources
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
