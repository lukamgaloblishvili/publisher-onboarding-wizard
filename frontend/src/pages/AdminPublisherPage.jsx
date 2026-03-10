import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Card } from "../components/Cards";
import { StatusPill } from "../components/StatusPill";

export function AdminPublisherPage() {
  const { publisherId } = useParams();
  const [publisher, setPublisher] = useState(null);
  const [publisherForm, setPublisherForm] = useState(null);
  const [campaignForm, setCampaignForm] = useState({ name: "", status: "in_progress" });
  const [userForm, setUserForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  async function loadPublisher() {
    try {
      setError("");
      const data = await api.getAdminPublisher(publisherId);
      setPublisher(data);
      setPublisherForm({
        name: data.name,
        slug: data.slug,
        slack_channel_embed_url: data.slack_channel_embed_url || "",
        resources_content_markdown: data.resources_content_markdown || ""
      });
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  useEffect(() => {
    loadPublisher();
  }, [publisherId]);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (!publisher || !publisherForm) {
    return <div className="empty-state">Loading publisher...</div>;
  }

  return (
    <div className="page-grid">
      <section className="page-header">
        <span className="eyebrow">Publisher Admin</span>
        <h1>{publisher.name}</h1>
        <p>Update workspace settings, add campaigns, and provision publisher access.</p>
      </section>
      <div className="panel-grid">
        <Card title="Publisher settings">
          <form
            className="stack-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await api.updatePublisher(publisher.id, publisherForm);
              await loadPublisher();
            }}
          >
            <input value={publisherForm.name} onChange={(event) => setPublisherForm((current) => ({ ...current, name: event.target.value }))} />
            <input value={publisherForm.slug} onChange={(event) => setPublisherForm((current) => ({ ...current, slug: event.target.value }))} />
            <input
              value={publisherForm.slack_channel_embed_url}
              onChange={(event) => setPublisherForm((current) => ({ ...current, slack_channel_embed_url: event.target.value }))}
            />
            <textarea
              rows="8"
              value={publisherForm.resources_content_markdown}
              onChange={(event) => setPublisherForm((current) => ({ ...current, resources_content_markdown: event.target.value }))}
            />
            <button className="primary-button">Save publisher</button>
          </form>
        </Card>
        <Card title="Create publisher login">
          <form
            className="stack-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await api.createPublisherUser(publisher.id, userForm);
              setUserForm({ username: "", password: "" });
            }}
          >
            <input placeholder="Username" value={userForm.username} onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))} />
            <input
              placeholder="Temporary password"
              type="password"
              value={userForm.password}
              onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
            />
            <button className="ghost-button">Create login</button>
          </form>
        </Card>
        <Card title="Create campaign" className="wide-card">
          <form
            className="stack-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await api.createCampaign(publisher.id, campaignForm);
              setCampaignForm({ name: "", status: "in_progress" });
              await loadPublisher();
            }}
          >
            <input placeholder="Campaign name" value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} />
            <select value={campaignForm.status} onChange={(event) => setCampaignForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_on_publisher">Waiting on Publisher</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
            <button className="primary-button">Add campaign</button>
          </form>
        </Card>
        <Card title="Campaigns" className="wide-card">
          <div className="campaign-list">
            {publisher.campaigns.map((campaign) => (
              <div className="campaign-admin-row" key={campaign.id}>
                <div>
                  <Link to={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
                  <span>
                    Integration {campaign.integration?.external_ticket_key || "unlinked"} | Compliance {campaign.compliance?.external_item_id || "unlinked"}
                  </span>
                </div>
                <StatusPill status={campaign.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
