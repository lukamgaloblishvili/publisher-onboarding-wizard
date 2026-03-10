import json


DEFAULT_RESOURCES = """## PX Default Resources

- [PX API Specs](https://api.px.com/)
- [Compliance Creative Submission Form](https://pxplatform.monday.com/boards/1604165432)
- [Open PX](https://open.px.com/login)

## FAQ and Knowledge Base

- [Accessing API token(s)](https://pxplatform.monday.com/boards/1604165432)
- [Different reporting](https://support.px.com/hc/en-us/sections/360001468054-Reports)
- For urgent operational blockers, use the shared Slack channel in the portal.
"""


CHECKLIST_TEMPLATES = {
    "api_real_time_leads_ping_post": {
        "label": "API Real-Time Leads (Ping Post)",
        "items": [
            "PX account is created and setup instructions have been shared",
            "Jornaya Entity Code confirmed (if applicable)",
            "Lead form includes all required fields, including TCPA disclosure",
            "Successful Ping and Post sent, including valid OriginalUrl, TcpaText, and other required fields",
            "Compliance and Finance reviews are completed",
            "Account switched to production (need additional test Ping in production)",
            "Important: Please wait for your Account Manager to confirm production readiness before sending live traffic.",
        ],
    },
    "api_real_time_leads_direct_post": {
        "label": "API Real-Time Leads (Direct Post)",
        "items": [
            "PX account is created and setup instructions have been shared",
            "Jornaya Entity Code confirmed (if applicable)",
            "Lead form includes all required fields, including TCPA disclosure",
            "Successful Direct Post sent, including valid OriginalUrl, TcpaText, SellResponseUrl, and other required fields",
            "Compliance and Finance reviews are completed",
            "Account switched to production",
            "Important: Please wait for your Account Manager to confirm production readiness before sending live traffic.",
        ],
    },
    "aged_data": {
        "label": "Aged Data",
        "items": [
            "PX account is created and setup instructions have been shared",
            "Successful Direct Post sent, including valid OriginalUrl, TcpaText, OriginalCreationDate, and other required fields",
            "Finance review is completed",
            "Account switched to production",
            "Important: Please wait for your Account Manager to confirm production readiness before sending live traffic.",
        ],
    },
    "ping_post_calls": {
        "label": "Ping Post Calls",
        "items": [
            "PX account is created and setup instructions have been shared",
            "Jornaya Entity Code confirmed for transfers (if applicable)",
            "Successful Ping, Post, and Call sent",
            "Call must be made within 15 seconds of the Ping (or 45 seconds for Home Services)",
            "Compliance and Finance reviews are completed",
            "Updated OfferId and DID numbers provided for production",
            "Account switched to production",
            "Important: Please wait for your Account Manager to confirm production readiness before sending live traffic.",
        ],
    },
    "branded_tracking_link": {
        "label": "Branded Tracking Link",
        "items": [
            "PX account is created and setup instructions have been shared",
            "Postback URL placed and a full test completed using the provided test link",
            "Postback receipt confirmed",
            "Finance review is completed",
            "Account switched to production",
            "Important: Please wait for your Account Manager to confirm production readiness before sending live traffic.",
        ],
    },
    "branded_api": {
        "label": "Branded API",
        "items": [
            "PX account is created and setup instructions have been shared",
            "Jornaya Entity Code confirmed (if applicable)",
            "Lead form includes all required fields, including TCPA disclosure",
            "Successful Direct Post sent, including valid OriginalUrl, TcpaText, SellResponseUrl, and other required fields",
            "Finance review is completed",
            "Account switched to production",
            "Important: Please wait for your Account Manager to confirm production readiness before sending live traffic.",
        ],
    },
    "calls": {
        "label": "Calls",
        "items": [
            "Not applicable",
        ],
    },
}


def build_checklist(template_key: str) -> str:
    template = CHECKLIST_TEMPLATES.get(template_key) or CHECKLIST_TEMPLATES["api_real_time_leads_ping_post"]
    items = [{"label": item, "completed": item == "Not applicable"} for item in template["items"]]
    return json.dumps(items)
