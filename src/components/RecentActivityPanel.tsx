import { Clock, Package, Puzzle, Sun, CheckCircle2 } from "lucide-react";
import type { ActivityEntry } from "../types";

interface RecentActivityPanelProps {
  activities: ActivityEntry[];
  onSeeAll: () => void;
}

const activityIcons: Record<string, typeof Clock> = {
  welcome: CheckCircle2,
  install: Package,
  mod: Puzzle,
  shader: Sun,
  update: Clock,
};

const activityColors: Record<string, string> = {
  welcome: "#00ff88",
  install: "#00ff88",
  mod: "#00ff88",
  shader: "#00ff88",
  update: "#00ff88",
};

export default function RecentActivityPanel({ activities, onSeeAll }: RecentActivityPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-zinc-100">Actividad reciente</span>
        </div>
        <button onClick={onSeeAll} className="text-xs text-zinc-500 hover:text-white transition-colors">
          Ver todas
        </button>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type] || Clock;
          const color = activityColors[activity.type] || "#00ff88";
          return (
            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-black/30 border border-white/5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                <Icon className="w-5 h-5" color={color} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-zinc-100">{activity.title}</span>
                <p className="text-xs opacity-60 mt-0.5">{activity.subtitle}</p>
              </div>
              <span className="text-xs opacity-50 flex-shrink-0 mt-1">{activity.timestamp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}