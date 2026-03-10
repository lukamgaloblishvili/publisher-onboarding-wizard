PORTAL_STATUS_VALUES = [
    "not_started",
    "in_progress",
    "waiting_on_publisher",
    "blocked",
    "completed",
]

JIRA_STATUS_MAP = {
    "to do": "not_started",
    "selected for development": "not_started",
    "in progress": "in_progress",
    "waiting on publisher": "waiting_on_publisher",
    "blocked": "blocked",
    "done": "completed",
}

MONDAY_STATUS_MAP = {
    "working on it": "in_progress",
    "stuck": "blocked",
    "done": "completed",
    "waiting for client": "waiting_on_publisher",
    "not started": "not_started",
}


def map_external_status(external_status: str | None, mapping: dict[str, str]) -> str:
    if not external_status:
        return "not_started"
    return mapping.get(external_status.strip().lower(), "in_progress")
