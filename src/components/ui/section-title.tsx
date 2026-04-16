import { clsx } from 'clsx';

type SectionTitleProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionTitle({ title, description, action, className }: SectionTitleProps) {
  return (
    <div className={clsx('flex items-start justify-between gap-3', className)}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
