import { LucideIcon } from 'lucide-react';
import { Card } from './card';

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
};

export function StatCard({ icon: Icon, label, value, hint }: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
