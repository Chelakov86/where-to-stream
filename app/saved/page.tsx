import { Suspense } from 'react';
import type { Metadata } from 'next';
import SavedView from '@/app/views/SavedView';

export const metadata: Metadata = {
  title: 'Saved titles — WhereToStream',
  description: 'Your shortlist of films and series, kept on this device.',
};

export default function SavedPage() {
  return (
    <Suspense fallback={null}>
      <SavedView />
    </Suspense>
  );
}
