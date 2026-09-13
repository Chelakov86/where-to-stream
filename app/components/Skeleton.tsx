import React from 'react';
import { cn } from '@/app/utils/cn';

interface SkeletonProps {
  className?: string;
}

/**
 * Pulsing placeholder block shown while content loads. Size it with classes.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" />
);

/**
 * Placeholder grid matching the poster grid of title cards.
 */
export const TitleGridSkeleton: React.FC<{ count?: number }> = ({ count = 10 }) => (
  <div
    className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
    role="status"
    aria-label="Loading titles"
  >
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton className="aspect-[2/3] w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);
