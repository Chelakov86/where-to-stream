import React from 'react';
import { Button } from '@/app/components/ui/button';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

/**
 * A row of mutually exclusive toggle buttons (e.g. All / Movies / Series).
 */
const SegmentedControl = <T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) => (
  <div role="group" aria-label={label} className="flex rounded-lg border border-border bg-card p-1">
    {options.map((option) => (
      <Button
        key={option.value}
        type="button"
        size="sm"
        variant={value === option.value ? 'default' : 'ghost'}
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className="min-w-14 shadow-none"
      >
        {option.label}
      </Button>
    ))}
  </div>
);

export default SegmentedControl;
