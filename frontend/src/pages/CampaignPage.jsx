import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { Card } from "../components/Cards";
import { ChecklistCard } from "../components/ChecklistCard";
import { MessagePanel } from "../components/MessagePanel";
import { StatusPill } from "../components/StatusPill";
import { CAMPAIGN_TYPE_OPTIONS } from "../constants";
import { useAuth } from "../hooks/useAuth";

export function CampaignPage() {
  const { campaignId } = useParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    status: "in_progress",
    campaign_type: "api_real_time_leads_ping_post"
  });
  const [integrationForm, setIntegrationForm] = useState({ external_ticket_key: "", external_ticket_url: "" });
  const [complianceForm, setComplianceForm] = useState({ external_item_id: "", external_ticket_url: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCampaign() {
    try {
      setLoading(true);
      setError("");
      const data = await api.getCampaign(campaignId);
      setCampaign(data);
      setCampaignForm({ name: data.name, status: data.status, campaign_type: data.campaign_type });
      setIntegrationForm({
        external_ticket_key: data.integration?.external_ticket_key || "",
        external_ticket_url: data.integration?.external_ticket_url || ""
      });
      setComplianceForm({
        external_item_id: data.compliance?.external_item_id || "",
        external_ticket_url: data.compliance?.external_ticket_url || ""
      });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  if (loading) {
    return <div className="empty-state">Loading campaign...</div>;
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  async function toggleChecklistItem(index) {
    const checklistItems = campaign.checklist_items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, completed: !item.completed } : item
    );
    await api.updateCampaign(campaign.id, { checklist_items: checklistItems });
    await loadCampaign();
  }

  return (
    <div className="page-grid">
      <section className="page-header">
        <span className="eyebrow">Campaign Detail</span>
        <h1>{campaign.name}</h1>
        <div className="inline-meta">
          <StatusPill status={campaign.status} />
          <span>Campaign ID: {campaign.id}</span>
        </div>
      </section>
      <ChecklistCard campaign={campaign} editable={user?.role === "admin"} onToggle={toggleChecklistItem} />
      {user?.role === "admin" ? (
        <div className="panel-grid">
          <Card title="Campaign settings">
            <form
              className="stack-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await api.updateCampaign(campaign.id, campaignForm);
                await loadCampaign();
              }}
            >
              <input value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} />
              <select value={campaignForm.status} onChange={(event) => setCampaignForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_on_publisher">Waiting on Publisher</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
              <select value={campaignForm.campaign_type} onChange={(event) => setCampaignForm((current) => ({ ...current, campaign_type: event.target.value }))}>
                {CAMPAIGN_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button className="primary-button">Save campaign</button>
            </form>
          </Card>
          <Card title="External links">
            <form
              className="stack-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await api.linkIntegration(campaign.id, integrationForm);
                await loadCampaign();
              }}
            >
              <input
                placeholder="Integration ticket key"
                value={integrationForm.external_ticket_key}
                onChange={(event) => setIntegrationForm((current) => ({ ...current, external_ticket_key: event.target.value }))}
              />
              <input
                placeholder="Integration ticket URL"
                value={integrationForm.external_ticket_url}
                onChange={(event) => setIntegrationForm((current) => ({ ...current, external_ticket_url: event.target.value }))}
              />
              <button className="ghost-button">Save integration link</button>
            </form>
            <form
              className="stack-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await api.linkCompliance(campaign.id, complianceForm);
                await loadCampaign();
              }}
            >
              <input
                placeholder="Compliance item ID"
                value={complianceForm.external_item_id}
                onChange={(event) => setComplianceForm((current) => ({ ...current, external_item_id: event.target.value }))}
              />
              <input
                placeholder="Compliance item URL"
                value={complianceForm.external_ticket_url}
                onChange={(event) => setComplianceForm((current) => ({ ...current, external_ticket_url: event.target.value }))}
              />
              <button className="ghost-button">Save compliance link</button>
            </form>
          </Card>
        </div>
      ) : null}
      <div className="panel-grid">
        <MessagePanel
          title="Integration"
          entity={campaign.integration}
          isAdmin={user?.role === "admin"}
          onSend={async (body) => {
            await api.postIntegrationMessage(campaign.integration.id, body);
            await loadCampaign();
          }}
          syncAction={
            campaign.integration
              ? async () => {
                  await api.syncIntegration(campaign.integration.id);
                  await loadCampaign();
                }
              : null
          }
        />
        <MessagePanel
          title="Compliance"
          entity={campaign.compliance}
          isAdmin={user?.role === "admin"}
          uploadEnabled
          onSend={async (body) => {
            await api.postComplianceMessage(campaign.compliance.id, body);
            await loadCampaign();
          }}
          onUpload={async (file, note) => {
            await api.uploadComplianceFile(campaign.compliance.id, file, note);
            await loadCampaign();
          }}
          syncAction={
            campaign.compliance
              ? async () => {
                  await api.syncCompliance(campaign.compliance.id);
                  await loadCampaign();
                }
              : null
          }
        />
      </div>
    </div>
  );
}
