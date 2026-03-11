PORTAL_STATUS_VALUES = [
    "not_started",
    "in_progress",
    "waiting_on_publisher",
    "blocked",
    "completed",
    "input_required",
    "rejected",
    "on_hold",
    "closed",
    "final_approval_required",
]

JIRA_STATUS_MAP = {
    "open": "in_progress",
    "response received": "in_progress",
    "pending client input": "input_required",
    "pending manager input": "input_required",
    "done": "completed",
    "completed - monitoring": "completed",
    "abandoned": "closed",
    "closed": "closed",
    "no compliance approval yet": "final_approval_required",
    "no finance approval yet": "final_approval_required",
}

MONDAY_STATUS_MAP = {
    "working on it": "in_progress",
    "stuck": "blocked",
    "done": "completed",
    "waiting for client": "waiting_on_publisher",
    "not started": "not_started",
    "to do": "not_started",
    "publisher updates requested": "input_required",
    "rejected": "rejected",
    "on hold": "on_hold",
}


def map_external_status(external_status: str | None, mapping: dict[str, str]) -> str:
    if not external_status:
        return "not_started"
    return mapping.get(external_status.strip().lower(), "in_progress")
