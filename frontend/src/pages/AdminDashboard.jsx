import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Card } from "../components/Cards";
import { DEFAULT_RESOURCES_MARKDOWN } from "../constants";

const emptyPublisher = {
  name: "",
  slug: "",
  slack_channel_embed_url: "",
  resources_content_markdown: DEFAULT_RESOURCES_MARKDOWN
};

export function AdminDashboard() {
  const [publishers, setPublishers] = useState([]);
  const [form, setForm] = useState(emptyPublisher);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function loadPublishers() {
    try {
      setError("");
      const data = await api.getAdminPublishers();
      setPublishers(data);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  useEffect(() => {
    loadPublishers();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    const publisher = await api.createPublisher(form);
    setForm(emptyPublisher);
    await loadPublishers();
    navigate(`/admin/publishers/${publisher.id}`);
  }

  return (
    <div className="page-grid">
      <section className="page-header">
        <span className="eyebrow">Admin</span>
        <h1>Publisher management</h1>
        <p>Create and maintain publisher workspaces, credentials, resources, and campaign links.</p>
      </section>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="dashboard-grid">
        <Card title="Publishers" className="wide-card">
          <div className="campaign-list">
            {publishers.map((publisher) => (
              <Link className="campaign-row" key={publisher.id} to={`/admin/publishers/${publisher.id}`}>
                <div>
                  <strong>{publisher.name}</strong>
                  <span>
                    {publisher.campaigns.length} campaigns | Slack {publisher.slack_channel_embed_url ? "configured" : "missing"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
        <Card title="Create publisher">
          <form className="stack-form" onSubmit={handleCreate}>
            <input placeholder="Publisher name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <input placeholder="Slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
            <label>
              Shared Slack Channel URL
              <input
                placeholder="https://slack.com/app_redirect?channel=..."
                value={form.slack_channel_embed_url}
                onChange={(event) => setForm((current) => ({ ...current, slack_channel_embed_url: event.target.value }))}
              />
            </label>
            <p className="form-helper-text">
              Paste the direct Slack link for the dedicated channel shared with this publisher. Use the channel link copied from Slack so publishers land in the
              correct conversation.
            </p>
            <textarea
              rows="6"
              value={form.resources_content_markdown}
              onChange={(event) => setForm((current) => ({ ...current, resources_content_markdown: event.target.value }))}
            />
            <button className="primary-button">Create publisher</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
