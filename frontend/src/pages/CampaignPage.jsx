import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/Cards";
import { ChecklistCard } from "../components/ChecklistCard";
import { MessagePanel } from "../components/MessagePanel";
import { StatusPill } from "../components/StatusPill";
import { DEFAULT_LAUNCH_MILESTONES } from "../constants";
import { useAuthStore } from "../stores/useAuthStore";
import { usePortalStore } from "../stores/usePortalStore";

export function CampaignPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const campaign = usePortalStore((state) => state.campaignsById[campaignId]);
  const loadCampaign = usePortalStore((state) => state.loadCampaign);
  const updateCampaign = usePortalStore((state) => state.updateCampaign);
  const linkIntegration = usePortalStore((state) => state.linkIntegration);
  const linkCompliance = usePortalStore((state) => state.linkCompliance);
  const syncIntegration = usePortalStore((state) => state.syncIntegration);
  const syncCompliance = usePortalStore((state) => state.syncCompliance);
  const postIntegrationMessage = usePortalStore((state) => state.postIntegrationMessage);
  const postComplianceMessage = usePortalStore((state) => state.postComplianceMessage);
  const uploadComplianceFile = usePortalStore((state) => state.uploadComplianceFile);
  const [campaignForm, setCampaignForm] = useState({ name: "", status: "in_progress" });
  const [milestonesDraft, setMilestonesDraft] = useState("");
  const [integrationForm, setIntegrationForm] = useState({ external_ticket_key: "", external_ticket_url: "" });
  const [complianceForm, setComplianceForm] = useState({ external_item_id: "", external_ticket_url: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    loadCampaign(campaignId).catch((nextError) => setError(nextError.message));
  }, [campaignId, loadCampaign]);

  useEffect(() => {
    if (!campaign) {
      return;
    }
    setCampaignForm({ name: campaign.name, status: campaign.status });
    setMilestonesDraft((campaign.checklist_items || []).map((item) => item.label).join("\n"));
    setIntegrationForm({
      external_ticket_key: campaign.integration?.external_ticket_key || "",
      external_ticket_url: campaign.integration?.external_ticket_url || ""
    });
    setComplianceForm({
      external_item_id: campaign.compliance?.external_item_id || "",
      external_ticket_url: campaign.compliance?.external_ticket_url || ""
    });
  }, [campaign]);

  const checklistItems = useMemo(() => campaign?.checklist_items || [], [campaign]);

  if (error) {
    return <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }

  if (!campaign) {
    return <div className="app-card text-sm text-black/60">Loading campaign...</div>;
  }

  function draftToChecklistItems() {
    const rows = milestonesDraft
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean);
    return rows.map((label, index) => ({
      label,
      completed: Boolean(checklistItems[index]?.completed)
    }));
  }

  async function runAction(action) {
    try {
      setError("");
      await action();
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <button
          type="button"
          className="app-button-link"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
              return;
            }
            navigate(user?.role === "admin" ? `/admin/publishers/${campaign.publisher_id}` : "/");
          }}
        >
          Back to {user?.role === "admin" ? "publisher" : "dashboard"}
        </button>
        <div className="space-y-3">
          <span className="text-xs uppercase tracking-[0.2em] text-px-deep">Campaign Detail</span>
          <h1 className="text-4xl font-semibold text-px-ink">{campaign.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-black/60">
            <StatusPill status={campaign.status} />
            <span>Campaign ID: {campaign.id}</span>
          </div>
        </div>
      </section>
      <ChecklistCard
        campaign={campaign}
        editable={user?.role === "admin"}
        onToggle={(index) =>
          runAction(async () => {
            const nextItems = checklistItems.map((item, itemIndex) => (itemIndex === index ? { ...item, completed: !item.completed } : item));
            await updateCampaign(campaign.id, { checklist_items: nextItems });
          })
        }
      />
      {user?.role === "admin" ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card title="Campaign settings">
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                await runAction(async () => {
                  await updateCampaign(campaign.id, campaignForm);
                });
              }}
            >
              <input className="app-input" value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} />
              <select className="app-input" value={campaignForm.status} onChange={(event) => setCampaignForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_on_publisher">Waiting on Publisher</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
              <button className="app-button-primary">Save campaign</button>
            </form>
          </Card>
          <Card title="Launch Milestones">
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                await runAction(async () => {
                  await updateCampaign(campaign.id, { checklist_items: draftToChecklistItems() });
                });
              }}
            >
              <textarea className="app-input min-h-36" rows="8" value={milestonesDraft} onChange={(event) => setMilestonesDraft(event.target.value)} placeholder="One milestone per line" />
              <div className="flex flex-wrap gap-3">
                <button className="app-button-primary">Save milestones</button>
                <button type="button" className="app-button-secondary" onClick={() => setMilestonesDraft(DEFAULT_LAUNCH_MILESTONES.join("\n"))}>
                  Reset defaults
                </button>
              </div>
            </form>
          </Card>
          <Card title="External links">
            <div className="space-y-5">
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await runAction(async () => {
                    await linkIntegration(campaign.id, integrationForm);
                  });
                }}
              >
                <input className="app-input" placeholder="Integration ticket key" value={integrationForm.external_ticket_key} onChange={(event) => setIntegrationForm((current) => ({ ...current, external_ticket_key: event.target.value }))} />
                <input className="app-input" placeholder="Integration ticket URL" value={integrationForm.external_ticket_url} onChange={(event) => setIntegrationForm((current) => ({ ...current, external_ticket_url: event.target.value }))} />
                <button className="app-button-secondary">Save integration link</button>
              </form>
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await runAction(async () => {
                    await linkCompliance(campaign.id, complianceForm);
                  });
                }}
              >
                <input className="app-input" placeholder="Compliance item ID" value={complianceForm.external_item_id} onChange={(event) => setComplianceForm((current) => ({ ...current, external_item_id: event.target.value }))} />
                <input className="app-input" placeholder="Compliance item URL" value={complianceForm.external_ticket_url} onChange={(event) => setComplianceForm((current) => ({ ...current, external_ticket_url: event.target.value }))} />
                <button className="app-button-secondary">Save compliance link</button>
              </form>
            </div>
          </Card>
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <MessagePanel
          title="Integration"
          entity={campaign.integration}
          isAdmin={user?.role === "admin"}
          onSend={(body) => runAction(() => postIntegrationMessage(campaign.id, campaign.integration.id, body))}
          syncAction={campaign.integration ? () => runAction(() => syncIntegration(campaign.id, campaign.integration.id)) : null}
        />
        <MessagePanel
          title="Compliance"
          entity={campaign.compliance}
          isAdmin={user?.role === "admin"}
          uploadEnabled
          onSend={(body) => runAction(() => postComplianceMessage(campaign.id, campaign.compliance.id, body))}
          onUpload={(file, note) => runAction(() => uploadComplianceFile(campaign.id, campaign.compliance.id, file, note))}
          syncAction={campaign.compliance ? () => runAction(() => syncCompliance(campaign.id, campaign.compliance.id)) : null}
        />
      </div>
    </div>
  );
}
