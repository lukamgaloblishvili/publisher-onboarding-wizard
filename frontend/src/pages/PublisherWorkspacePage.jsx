import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Cards";
import { ChecklistCard } from "../components/ChecklistCard";
import { MarkdownContent } from "../components/MarkdownContent";
import { MessagePanel } from "../components/MessagePanel";
import { StatusPill } from "../components/StatusPill";
import { usePortalStore } from "../stores/usePortalStore";

function completionPercent(items) {
  if (!items?.length) {
    return 0;
  }
  const completed = items.filter((item) => item.completed).length;
  return Math.round((completed / items.length) * 100);
}

function sectionButton(isActive) {
  return [
    "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition",
    isActive ? "bg-px-green text-white" : "bg-black/5 text-black/55 hover:bg-px-mist hover:text-px-deep"
  ].join(" ");
}

function campaignDetail(campaign) {
  return [
    campaign.integration?.external_ticket_key ? `Integration ${campaign.integration.external_ticket_key}` : "Integration unlinked",
    campaign.compliance?.external_item_id ? `Compliance ${campaign.compliance.external_item_id}` : "Compliance unlinked"
  ].join(" • ");
}

export function PublisherWorkspacePage({ publisher }) {
  const resources = usePortalStore((state) => state.resources);
  const loadResources = usePortalStore((state) => state.loadResources);
  const postIntegrationMessage = usePortalStore((state) => state.postIntegrationMessage);
  const postComplianceMessage = usePortalStore((state) => state.postComplianceMessage);
  const uploadComplianceFile = usePortalStore((state) => state.uploadComplianceFile);
  const loadCampaign = usePortalStore((state) => state.loadCampaign);
  const liveCampaignsById = usePortalStore((state) => state.campaignsById);
  const [expandedCampaignId, setExpandedCampaignId] = useState(publisher.campaigns[0]?.id ?? null);
  const [selection, setSelection] = useState(
    publisher.campaigns[0]
      ? { type: "campaign_overview", campaignId: publisher.campaigns[0].id }
      : { type: "resources", campaignId: null }
  );
  const [error, setError] = useState("");

  useEffect(() => {
    loadResources().catch((nextError) => setError(nextError.message));
  }, [loadResources]);

  const campaigns = useMemo(
    () =>
      publisher.campaigns.map((campaign) => ({
        ...campaign,
        ...(liveCampaignsById[campaign.id] || {})
      })),
    [liveCampaignsById, publisher.campaigns]
  );

  const selectedCampaign = selection.campaignId ? campaigns.find((campaign) => campaign.id === selection.campaignId) : null;

  async function focusCampaign(campaignId, type) {
    setExpandedCampaignId(campaignId);
    setSelection({ type, campaignId });
    if (type !== "resources") {
      try {
        await loadCampaign(campaignId);
      } catch (nextError) {
        setError(nextError.message);
      }
    }
  }

  function renderDetailPanel() {
    if (selection.type === "resources") {
      return (
        <Card title="Resources" className="h-full">
          {resources ? (
            <div className="space-y-4">
              <p className="text-sm leading-7 text-black/65">
                Everything here supports launch readiness for new campaigns. This complements open.px.com without replacing it.
              </p>
              <MarkdownContent content={resources.content_markdown} />
            </div>
          ) : (
            <div className="rounded-2xl bg-px-mist/70 px-4 py-4 text-sm text-black/60">Loading resources...</div>
          )}
        </Card>
      );
    }

    if (!selectedCampaign) {
      return (
        <Card title="Workspace detail" className="h-full">
          <div className="rounded-2xl bg-px-mist/70 px-4 py-4 text-sm text-black/60">Select a campaign section from the left to continue.</div>
        </Card>
      );
    }

    if (selection.type === "campaign_overview") {
      return (
        <div className="space-y-6">
          <Card title={selectedCampaign.name}>
            <div className="flex flex-wrap items-center gap-3 text-sm text-black/60">
              <StatusPill status={selectedCampaign.status} />
              <span>{campaignDetail(selectedCampaign)}</span>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-black/65">
              Focus this workspace on the next launch blocker. Open Integration or Compliance from the campaign on the left to continue the conversation
              without leaving this page.
            </p>
          </Card>
          <ChecklistCard campaign={selectedCampaign} />
        </div>
      );
    }

    if (selection.type === "integration" && selectedCampaign.integration) {
      return (
        <MessagePanel
          title={`${selectedCampaign.name} • Integration`}
          entity={selectedCampaign.integration}
          onSend={(body) =>
            postIntegrationMessage(selectedCampaign.id, selectedCampaign.integration.id, body).catch((nextError) => {
              setError(nextError.message);
            })
          }
        />
      );
    }

    if (selection.type === "compliance" && selectedCampaign.compliance) {
      return (
        <MessagePanel
          title={`${selectedCampaign.name} • Compliance`}
          entity={selectedCampaign.compliance}
          uploadEnabled
          onSend={(body) =>
            postComplianceMessage(selectedCampaign.id, selectedCampaign.compliance.id, body).catch((nextError) => {
              setError(nextError.message);
            })
          }
          onUpload={(file, note) =>
            uploadComplianceFile(selectedCampaign.id, selectedCampaign.compliance.id, file, note).catch((nextError) => {
              setError(nextError.message);
            })
          }
        />
      );
    }

    return (
      <Card title="Workspace detail">
        <div className="rounded-2xl bg-px-mist/70 px-4 py-4 text-sm text-black/60">This item is not available yet.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-3">
          <span className="text-xs uppercase tracking-[0.2em] text-px-deep">Publisher Workspace</span>
          <h1 className="text-4xl font-semibold text-px-ink">{publisher.name}</h1>
          <p className="max-w-4xl text-base leading-7 text-black/65">
            This workspace keeps campaign onboarding easy to follow. Expand a campaign on the left, choose Integration, Compliance, or Overview, and work
            through launch items without changing pages.
          </p>
        </div>
        <Card title="Workspace Focus">
          <div className="space-y-4">
            <p className="text-sm leading-7 text-black/70">
              This portal centralizes onboarding and go-live work across Integration, Compliance, resources, and Slack. It does not replace open.px.com.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className={sectionButton(selection.type === "resources")} onClick={() => setSelection({ type: "resources", campaignId: null })}>
                Resources
              </button>
              {publisher.slack_channel_embed_url ? (
                <a className="app-button-secondary !py-2" href={publisher.slack_channel_embed_url} target="_blank" rel="noreferrer">
                  Open Slack Channel
                </a>
              ) : null}
            </div>
          </div>
        </Card>
      </section>
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Card title="Campaigns" className="sticky top-6">
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const expanded = expandedCampaignId === campaign.id;
                const percent = completionPercent(campaign.checklist_items || []);
                return (
                  <div key={campaign.id} className="rounded-[1.6rem] border border-black/10 bg-white/80">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left"
                      onClick={() => {
                        setExpandedCampaignId(expanded ? null : campaign.id);
                        if (!expanded) {
                          setSelection({ type: "campaign_overview", campaignId: campaign.id });
                        }
                      }}
                    >
                      <div className="space-y-3">
                        <div>
                          <strong className="block text-sm font-semibold text-px-ink">{campaign.name}</strong>
                          <span className="text-sm text-black/60">{campaignDetail(campaign)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusPill status={campaign.status} />
                          <span className="text-xs uppercase tracking-[0.16em] text-black/45">{percent}% milestones complete</span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-px-deep">{expanded ? "Collapse" : "Expand"}</span>
                    </button>
                    {expanded ? (
                      <div className="border-t border-black/10 px-5 py-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <button className={sectionButton(selection.type === "campaign_overview" && selection.campaignId === campaign.id)} onClick={() => focusCampaign(campaign.id, "campaign_overview")}>
                            Overview
                          </button>
                          <button className={sectionButton(selection.type === "integration" && selection.campaignId === campaign.id)} onClick={() => focusCampaign(campaign.id, "integration")}>
                            Integration
                          </button>
                          <button className={sectionButton(selection.type === "compliance" && selection.campaignId === campaign.id)} onClick={() => focusCampaign(campaign.id, "compliance")}>
                            Compliance
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        <div>{renderDetailPanel()}</div>
      </div>
    </div>
  );
}
