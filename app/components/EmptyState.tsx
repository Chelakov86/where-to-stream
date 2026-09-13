import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/app/utils/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'neutral' | 'danger';
  className?: string;
}

/**
 * Card explaining why there is nothing to show, with an optional recovery action.
 * The danger tone is announced to assistive technology as an alert.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  className,
}) => (
  <div
    className={cn(
      'rounded-lg border bg-card px-5 py-10 text-center shadow-sm',
      tone === 'danger' ? 'border-destructive/35' : 'border-border',
      className
    )}
    role={tone === 'danger' ? 'alert' : undefined}
  >
    {Icon && (
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
    )}
    <p className="mt-3 font-display font-semibold text-foreground">{title}</p>
    {description && (
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    )}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export default EmptyState;
