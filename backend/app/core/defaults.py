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


DEFAULT_LAUNCH_CHECKLIST = [
    "Integration instructions shared",
    "Successful test lead sent to PX",
    "Lead form includes all required fields, including TCPA disclosure",
    "Creative approval + Jornaya Entity Code confirmed (if applicable)",
    "Account switched to production (need additional test Ping in production)",
    "Green light from account manager to start sending live leads",
]


def build_checklist(_template_key: str) -> str:
    items = [{"label": item, "completed": False} for item in DEFAULT_LAUNCH_CHECKLIST]
    return json.dumps(items)
