const defaultApiBase =
  typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8000` : "http://127.0.0.1:8000";

const runtimeApiBase =
  typeof window !== "undefined" && window.__APP_CONFIG__ ? window.__APP_CONFIG__.VITE_API_URL : "";

const API_BASE = runtimeApiBase || import.meta.env.VITE_API_URL || defaultApiBase;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : data.detail || "Request failed");
  }

  return data;
}

export const api = {
  loginAdmin: (payload) => request("/auth/admin/login", { method: "POST", body: JSON.stringify(payload) }),
  loginPublisher: (payload) => request("/auth/publisher/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/me"),
  getCurrentPublisher: () => request("/publishers/current"),
  getResources: () => request("/resources/current"),
  getCampaign: (campaignId) => request(`/campaigns/${campaignId}`),
  getAdminPublishers: () => request("/admin/publishers"),
  getAdminPublisher: (publisherId) => request(`/admin/publishers/${publisherId}`),
  createPublisher: (payload) => request("/admin/publishers", { method: "POST", body: JSON.stringify(payload) }),
  updatePublisher: (publisherId, payload) => request(`/admin/publishers/${publisherId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  resetPublisherAccessCode: (publisherId) => request(`/admin/publishers/${publisherId}/access-code/reset`, { method: "POST" }),
  deletePublisher: (publisherId) => request(`/admin/publishers/${publisherId}`, { method: "DELETE" }),
  createCampaign: (publisherId, payload) => request(`/admin/publishers/${publisherId}/campaigns`, { method: "POST", body: JSON.stringify(payload) }),
  deleteCampaign: (campaignId) => request(`/admin/campaigns/${campaignId}`, { method: "DELETE" }),
  updateCampaign: (campaignId, payload) => request(`/admin/campaigns/${campaignId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  linkIntegration: (campaignId, payload) =>
    request(`/admin/campaigns/${campaignId}/integration/link`, { method: "POST", body: JSON.stringify(payload) }),
  linkCompliance: (campaignId, payload) =>
    request(`/admin/campaigns/${campaignId}/compliance/link`, { method: "POST", body: JSON.stringify(payload) }),
  syncIntegration: (integrationId) => request(`/admin/integration/${integrationId}/sync`, { method: "POST" }),
  syncCompliance: (complianceId) => request(`/admin/compliance/${complianceId}/sync`, { method: "POST" }),
  postIntegrationMessage: (integrationId, body) =>
    request(`/integration/${integrationId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  postComplianceMessage: (complianceId, body) =>
    request(`/compliance/${complianceId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  uploadComplianceFile: (complianceId, file, note) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("note", note);
    return request(`/compliance/${complianceId}/upload`, { method: "POST", body: formData });
  }
};

export { API_BASE };
