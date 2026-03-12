import { create } from "zustand";
import { api } from "../api/client";

function updateCampaignInPublisher(publisher, campaign) {
  if (!publisher) {
    return publisher;
  }
  return {
    ...publisher,
    campaigns: publisher.campaigns.map((item) => (item.id === campaign.id ? campaign : item))
  };
}

export const usePortalStore = create((set, get) => ({
  currentPublisher: null,
  resources: null,
  adminPublishers: [],
  adminPublisher: null,
  campaignsById: {},
  latestAccessCode: "",
  async loadCurrentPublisher() {
    const publisher = await api.getCurrentPublisher();
    set({ currentPublisher: publisher });
    return publisher;
  },
  async loadResources() {
    const resources = await api.getResources();
    set({ resources });
    return resources;
  },
  async loadAdminPublishers() {
    const adminPublishers = await api.getAdminPublishers();
    set({ adminPublishers });
    return adminPublishers;
  },
  async loadAdminPublisher(publisherId) {
    const adminPublisher = await api.getAdminPublisher(publisherId);
    set({ adminPublisher, latestAccessCode: "" });
    return adminPublisher;
  },
  async createPublisher(payload) {
    const result = await api.createPublisher(payload);
    set((state) => ({
      adminPublishers: [...state.adminPublishers, result.publisher],
      adminPublisher: result.publisher,
      latestAccessCode: result.access_code
    }));
    return result;
  },
  async updatePublisher(publisherId, payload) {
    const publisher = await api.updatePublisher(publisherId, payload);
    set((state) => ({
      adminPublishers: state.adminPublishers.map((item) => (item.id === publisher.id ? publisher : item)),
      adminPublisher: publisher,
      currentPublisher: state.currentPublisher?.id === publisher.id ? publisher : state.currentPublisher
    }));
    return publisher;
  },
  async resetPublisherAccessCode(publisherId) {
    const result = await api.resetPublisherAccessCode(publisherId);
    set((state) => ({
      adminPublishers: state.adminPublishers.map((item) => (item.id === result.publisher.id ? result.publisher : item)),
      adminPublisher: result.publisher,
      latestAccessCode: result.access_code
    }));
    return result;
  },
  async deletePublisher(publisherId) {
    await api.deletePublisher(publisherId);
    set((state) => ({
      adminPublishers: state.adminPublishers.filter((item) => item.id !== publisherId),
      adminPublisher: state.adminPublisher?.id === publisherId ? null : state.adminPublisher,
      currentPublisher: state.currentPublisher?.id === publisherId ? null : state.currentPublisher
    }));
  },
  async createCampaign(publisherId, payload) {
    const campaign = await api.createCampaign(publisherId, payload);
    set((state) => ({
      adminPublishers: state.adminPublishers.map((item) =>
        item.id === publisherId ? { ...item, campaigns: [...item.campaigns, campaign] } : item
      ),
      adminPublisher: state.adminPublisher
        ? { ...state.adminPublisher, campaigns: [...state.adminPublisher.campaigns, campaign] }
        : state.adminPublisher
    }));
    return campaign;
  },
  async deleteCampaign(campaignId) {
    await api.deleteCampaign(campaignId);
    set((state) => {
      const nextCampaignsById = { ...state.campaignsById };
      delete nextCampaignsById[campaignId];
      return {
        campaignsById: nextCampaignsById,
        adminPublishers: state.adminPublishers.map((item) => ({
          ...item,
          campaigns: item.campaigns.filter((campaign) => campaign.id !== campaignId)
        })),
        adminPublisher: state.adminPublisher
          ? { ...state.adminPublisher, campaigns: state.adminPublisher.campaigns.filter((item) => item.id !== campaignId) }
          : state.adminPublisher,
        currentPublisher: state.currentPublisher
          ? { ...state.currentPublisher, campaigns: state.currentPublisher.campaigns.filter((item) => item.id !== campaignId) }
          : state.currentPublisher
      };
    });
  },
  async loadCampaign(campaignId) {
    const campaign = await api.getCampaign(campaignId);
    set((state) => ({
      campaignsById: { ...state.campaignsById, [campaignId]: campaign },
      adminPublisher: state.adminPublisher ? updateCampaignInPublisher(state.adminPublisher, campaign) : state.adminPublisher,
      currentPublisher: state.currentPublisher ? updateCampaignInPublisher(state.currentPublisher, campaign) : state.currentPublisher
    }));
    return campaign;
  },
  async updateCampaign(campaignId, payload) {
    const campaign = await api.updateCampaign(campaignId, payload);
    set((state) => ({
      campaignsById: { ...state.campaignsById, [campaignId]: campaign },
      adminPublisher: state.adminPublisher ? updateCampaignInPublisher(state.adminPublisher, campaign) : state.adminPublisher,
      currentPublisher: state.currentPublisher ? updateCampaignInPublisher(state.currentPublisher, campaign) : state.currentPublisher
    }));
    return campaign;
  },
  async linkIntegration(campaignId, payload) {
    await api.linkIntegration(campaignId, payload);
    return get().loadCampaign(campaignId);
  },
  async linkCompliance(campaignId, payload) {
    await api.linkCompliance(campaignId, payload);
    return get().loadCampaign(campaignId);
  },
  async syncIntegration(campaignId, integrationId) {
    await api.syncIntegration(integrationId);
    return get().loadCampaign(campaignId);
  },
  async syncCompliance(campaignId, complianceId) {
    await api.syncCompliance(complianceId);
    return get().loadCampaign(campaignId);
  },
  async postIntegrationMessage(campaignId, integrationId, body) {
    const message = await api.postIntegrationMessage(integrationId, body);
    set((state) => {
      const campaign = state.campaignsById[campaignId];
      if (!campaign?.integration) {
        return state;
      }
      const nextCampaign = {
        ...campaign,
        integration: {
          ...campaign.integration,
          messages: [...(campaign.integration.messages || []), message]
        }
      };
      return {
        campaignsById: { ...state.campaignsById, [campaignId]: nextCampaign },
        adminPublisher: state.adminPublisher ? updateCampaignInPublisher(state.adminPublisher, nextCampaign) : state.adminPublisher,
        currentPublisher: state.currentPublisher ? updateCampaignInPublisher(state.currentPublisher, nextCampaign) : state.currentPublisher
      };
    });
    return message;
  },
  async postComplianceMessage(campaignId, complianceId, body) {
    const message = await api.postComplianceMessage(complianceId, body);
    set((state) => {
      const campaign = state.campaignsById[campaignId];
      if (!campaign?.compliance) {
        return state;
      }
      const nextCampaign = {
        ...campaign,
        compliance: {
          ...campaign.compliance,
          messages: [...(campaign.compliance.messages || []), message]
        }
      };
      return {
        campaignsById: { ...state.campaignsById, [campaignId]: nextCampaign },
        adminPublisher: state.adminPublisher ? updateCampaignInPublisher(state.adminPublisher, nextCampaign) : state.adminPublisher,
        currentPublisher: state.currentPublisher ? updateCampaignInPublisher(state.currentPublisher, nextCampaign) : state.currentPublisher
      };
    });
    return message;
  },
  async uploadComplianceFile(campaignId, complianceId, file, note) {
    const message = await api.uploadComplianceFile(complianceId, file, note);
    set((state) => {
      const campaign = state.campaignsById[campaignId];
      if (!campaign?.compliance) {
        return state;
      }
      const nextCampaign = {
        ...campaign,
        compliance: {
          ...campaign.compliance,
          messages: [...(campaign.compliance.messages || []), message]
        }
      };
      return {
        campaignsById: { ...state.campaignsById, [campaignId]: nextCampaign },
        adminPublisher: state.adminPublisher ? updateCampaignInPublisher(state.adminPublisher, nextCampaign) : state.adminPublisher,
        currentPublisher: state.currentPublisher ? updateCampaignInPublisher(state.currentPublisher, nextCampaign) : state.currentPublisher
      };
    });
    return message;
  }
}));
