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
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <strong className="text-sm font-semibold text-px-ink">
          {completedCount} of {items.length} milestones completed
        </strong>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/10 lg:w-52" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-px-green to-emerald-400" style={{ width: `${completionPercent}%` }} />
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <button
            type="button"
            key={`${campaign.id}-${index}`}
            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
              item.completed ? "border-px-green/20 bg-px-green/10" : "border-black/10 bg-white/80"
            } ${editable ? "hover:border-px-green/30" : "cursor-default"}`}
            disabled={!editable}
            onClick={() => onToggle?.(index)}
          >
            <span className={`h-3 w-3 rounded-full ${item.completed ? "bg-px-deep" : "bg-black/20"}`} />
            <span className="text-sm text-px-ink">{item.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
