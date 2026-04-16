import { clsx } from 'clsx';

const statusClasses: Record<string, string> = {
  'new lead': 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  'waiting on deposit': 'bg-amber-100 text-amber-700',
  'waiting on parts': 'bg-orange-100 text-orange-700',
  'in progress': 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  'payment pending': 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'rounded-full px-3 py-1 text-[11px] font-medium',
        statusClasses[status] ?? 'bg-slate-100 text-slate-700',
      )}
    >
      {status}
    </span>
  );
}
