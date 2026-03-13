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

export function PublisherWorkspacePage({ publisher }) {
  const resources = usePortalStore((state) => state.resources);
  const loadResources = usePortalStore((state) => state.loadResources);
  const postIntegrationMessage = usePortalStore((state) => state.postIntegrationMessage);
  const postComplianceMessage = usePortalStore((state) => state.postComplianceMessage);
  const uploadComplianceFile = usePortalStore((state) => state.uploadComplianceFile);
  const loadCampaign = usePortalStore((state) => state.loadCampaign);
  const liveCampaignsById = usePortalStore((state) => state.campaignsById);
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [selection, setSelection] = useState({ type: null, campaignId: null });
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
    if (!selection.type) {
      return (
        <Card className="h-full">
          <div className="flex min-h-[28rem] items-center justify-center rounded-[1.75rem] border border-dashed border-black/10 bg-px-mist/40 px-8 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-px-deep">Workspace Detail</p>
              <h2 className="text-2xl font-semibold text-px-ink">Select an item from the left</h2>
              <p className="text-sm leading-7 text-black/60">
                Choose a campaign section, open Resources, or jump to Slack from the left rail and the related details will appear here.
              </p>
            </div>
          </div>
        </Card>
      );
    }

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
          title={`${selectedCampaign.name} - Integration`}
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
          title={`${selectedCampaign.name} - Compliance`}
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
      <section className="space-y-3">
        <span className="text-xs uppercase tracking-[0.2em] text-px-deep">Publisher Workspace</span>
        <h1 className="text-4xl font-semibold text-px-ink">{publisher.name}</h1>
        <p className="max-w-4xl text-base leading-7 text-black/65">
          This workspace keeps campaign onboarding easy to follow. Expand a campaign on the left, choose Integration, Compliance, or Overview, and work
          through launch items without changing pages.
        </p>
      </section>
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Card title="Campaigns">
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
                        const nextExpandedCampaignId = expanded ? null : campaign.id;
                        setExpandedCampaignId(nextExpandedCampaignId);
                        if (expanded && selection.campaignId === campaign.id) {
                          setSelection({ type: null, campaignId: null });
                        } else if (!expanded) {
                          setSelection({ type: "campaign_overview", campaignId: campaign.id });
                        }
                      }}
                    >
                      <div className="space-y-3">
                        <div>
                          <strong className="block text-sm font-semibold text-px-ink">{campaign.name}</strong>
                          <span className="text-sm text-black/60">Open Overview, Integration, or Compliance to work through this campaign.</span>
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
          <Card title="Workspace Tools">
            <div className="space-y-4">
              <p className="text-sm leading-7 text-black/70">
                Shared resources and Slack stay available here while you work through campaign tasks.
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
        </div>
        <div>{renderDetailPanel()}</div>
      </div>
    </div>
  );
}
