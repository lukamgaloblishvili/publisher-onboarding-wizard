const LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting_on_publisher: "Waiting on Publisher",
  blocked: "Blocked",
  completed: "Completed",
  input_required: "Input Required",
  rejected: "Rejected",
  on_hold: "On Hold",
  closed: "Closed",
  final_approval_required: "Final Approval Required"
};

export function StatusPill({ status }) {
  return <span className={`status-pill status-${status || "not_started"}`}>{LABELS[status] || status || "Unknown"}</span>;
}
