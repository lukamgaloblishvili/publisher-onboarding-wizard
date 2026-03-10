import { Card } from "./Cards";
import { CAMPAIGN_TYPE_LABELS } from "../constants";

function progress(items) {
  if (!items.length) {
    return 0;
  }
  const completed = items.filter((item) => item.completed).length;
  return Math.round((completed / items.length) * 100);
}

export function ChecklistCard({ campaign, editable = false, onToggle }) {
  const items = campaign.checklist_items || [];
  const completion = progress(items);

  return (
    <Card title="Launch Checklist">
      <div className="checklist-header">
        <div>
          <strong>{CAMPAIGN_TYPE_LABELS[campaign.campaign_type] || campaign.campaign_type}</strong>
          <span>{completion}% complete</span>
        </div>
        <div className="progress-track">
          <div className="progress-bar" style={{ width: `${completion}%` }} />
        </div>
      </div>
      <div className="checklist-list">
        {items.map((item, index) => (
          <label key={`${campaign.id}-${index}`} className="checklist-item">
            <input
              type="checkbox"
              checked={Boolean(item.completed)}
              disabled={!editable}
              onChange={() => onToggle?.(index)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}
