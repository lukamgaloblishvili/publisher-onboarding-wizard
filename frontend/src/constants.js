export const CAMPAIGN_TYPE_OPTIONS = [
  ["api_real_time_leads_ping_post", "API Real-Time Leads (Ping Post)"],
  ["api_real_time_leads_direct_post", "API Real-Time Leads (Direct Post)"],
  ["aged_data", "Aged Data"],
  ["ping_post_calls", "Ping Post Calls"],
  ["branded_tracking_link", "Branded Tracking Link"],
  ["branded_api", "Branded API"],
  ["calls", "Calls"]
];

export const CAMPAIGN_TYPE_LABELS = Object.fromEntries(CAMPAIGN_TYPE_OPTIONS);

export const DEFAULT_RESOURCES_MARKDOWN = `## PX Default Resources

- [PX API Specs](https://api.px.com/)
- [Compliance Creative Submission Form](https://pxplatform.monday.com/boards/1604165432)
- [Open PX](https://open.px.com/login)

## FAQ and Knowledge Base

- [Accessing API token(s)](https://pxplatform.monday.com/boards/1604165432)
- [Different reporting](https://support.px.com/hc/en-us/sections/360001468054-Reports)
- For urgent operational blockers, use the shared Slack channel in the portal.
`;
