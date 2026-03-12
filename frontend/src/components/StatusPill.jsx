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

const STYLES = {
  not_started: "bg-px-slate/70 text-px-ink",
  in_progress: "bg-px-green/10 text-px-deep",
  waiting_on_publisher: "bg-px-accent/15 text-fuchsia-700",
  blocked: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  input_required: "bg-px-accent/15 text-fuchsia-700",
  rejected: "bg-red-100 text-red-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  closed: "bg-black/10 text-black/70",
  final_approval_required: "bg-yellow-100 text-yellow-700"
};

export function StatusPill({ status }) {
  const value = status || "not_started";
  return <span className={`app-pill ${STYLES[value] || STYLES.not_started}`}>{LABELS[value] || value || "Unknown"}</span>;
}
