/**
 * Loading skeleton components for better perceived performance.
 * Provides placeholder UI while content is loading.
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Base skeleton component for creating loading placeholders
 * @param className - Additional Tailwind classes
 * @param variant - Shape variant (text, circular, rectangular)
 * @param width - Width in pixels or CSS string
 * @param height - Height in pixels or CSS string
 * @param animation - Animation type (pulse, wave, none)
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-muted-violet/50';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    none: '',
  };

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * Skeleton placeholder for a search result item
 * Matches the layout of ResultItem component
 */
export const ResultItemSkeleton: React.FC = () => (
  <article
    className="flex gap-4 p-4 bg-muted-violet/30 rounded-xl"
    role="status"
    aria-label="Loading search result"
  >
    <Skeleton variant="rectangular" width={100} height={150} />
    <div className="flex-1 space-y-3">
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" width="40%" height={16} />
      <Skeleton variant="text" width="100%" height={40} />
      <Skeleton variant="text" width="30%" height={16} />
    </div>
  </article>
);

/**
 * Skeleton placeholder for detailed result view
 * Matches the layout of ResultDetails component
 */
export const ResultDetailsSkeleton: React.FC = () => (
  <section
    className="glass-panel rounded-xl text-white shadow-lg p-4 sm:p-5 md:p-6 max-w-4xl mx-auto"
    role="status"
    aria-label="Loading title details"
  >
    <div className="flex flex-col md:flex-row gap-6">
      {/* Poster skeleton */}
      <div className="md:w-1/3">
        <Skeleton variant="rectangular" width="100%" height={450} className="max-w-xs" />
      </div>

      {/* Details skeleton */}
      <div className="flex-1 space-y-4">
        <Skeleton variant="text" width="70%" height={32} />
        <Skeleton variant="text" width="50%" height={20} />
        <div className="space-y-2">
          <Skeleton variant="text" width="100%" height={16} />
          <Skeleton variant="text" width="100%" height={16} />
          <Skeleton variant="text" width="100%" height={16} />
          <Skeleton variant="text" width="80%" height={16} />
        </div>
        <Skeleton variant="text" width="40%" height={20} />
      </div>
    </div>

    {/* Availability skeleton */}
    <div className="mt-6 space-y-4">
      <Skeleton variant="text" width={200} height={24} />
      <Skeleton variant="rectangular" width="100%" height={200} />
    </div>
  </section>
);

/**
 * Skeleton placeholder for genre list loading
 */
export const GenresSkeleton: React.FC = () => (
  <div className="space-y-2">
    <Skeleton variant="text" width="30%" height={16} />
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" width={80} height={32} className="rounded-full" />
      ))}
    </div>
  </div>
);
