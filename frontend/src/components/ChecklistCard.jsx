import { Card } from "./Cards";

function completion(items) {
  if (!items.length) {
    return 0;
  }
  const completedCount = items.filter((item) => item.completed).length;
  return Math.round((completedCount / items.length) * 100);
}

export function ChecklistCard({ campaign, editable = false, onToggle }) {
  const items = campaign.checklist_items || [];
  const completedCount = items.filter((item) => item.completed).length;
  const completionPercent = completion(items);

  return (
    <Card title="Launch Milestones">
      <div className="checklist-header">
        <strong>{completedCount} of {items.length} milestones completed</strong>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${completionPercent}%` }} />
        </div>
      </div>
      <div className="checklist-list">
        {items.map((item, index) => (
          <button
            type="button"
            key={`${campaign.id}-${index}`}
            className={`checklist-item ${item.completed ? "is-complete" : ""}`}
            disabled={!editable}
            onClick={() => onToggle?.(index)}
          >
            <span className={`milestone-indicator ${item.completed ? "is-complete" : ""}`} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
