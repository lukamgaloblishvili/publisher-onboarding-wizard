import { Link } from "react-router-dom";
import { Card } from "../components/Cards";
import { StatusPill } from "../components/StatusPill";

export function PublisherDashboard({ publisher }) {
  return (
    <div className="page-grid">
      <section className="page-header">
        <span className="eyebrow">Publisher Workspace</span>
        <h1>{publisher.name}</h1>
        <p>Review active campaign workstreams, shared Slack access, and key resources.</p>
      </section>
      <div className="dashboard-grid">
        <Card title="Campaigns" className="wide-card">
          <div className="campaign-list">
            {publisher.campaigns.map((campaign) => (
              <Link className="campaign-row" key={campaign.id} to={`/campaigns/${campaign.id}`}>
                <div>
                  <strong>{campaign.name}</strong>
                  <span>
                    Integration: {campaign.integration?.external_ticket_key || "Not linked"} | Compliance:{" "}
                    {campaign.compliance?.external_item_id || "Not linked"}
                  </span>
                </div>
                <StatusPill status={campaign.status} />
              </Link>
            ))}
          </div>
        </Card>
        <Card title="Shared Slack">
          {publisher.slack_channel_embed_url ? (
            <div className="stack">
              <p>One shared communication entry for this publisher account.</p>
              <a className="primary-button inline-button" href={publisher.slack_channel_embed_url} target="_blank" rel="noreferrer">
                Open Slack
              </a>
            </div>
          ) : (
            <div className="empty-state">Slack has not been configured yet.</div>
          )}
        </Card>
        <Card title="Resources">
          <p>Reference onboarding guides, compliance instructions, and account-specific notes.</p>
          <Link className="ghost-button inline-button" to="/resources">
            View resources
          </Link>
        </Card>
      </div>
    </div>
  );
}
