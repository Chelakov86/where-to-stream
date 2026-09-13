import React from 'react';
import { cn } from '@/app/utils/cn';

/**
 * Centered, padded content column shared by every page.
 */
const PageContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)} {...props} />
);

export default PageContainer;
