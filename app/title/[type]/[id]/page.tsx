import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TitleView from '@/app/views/TitleView';
import { parseTitleRouteParams } from '@/app/utils/titleRoute';

export const metadata: Metadata = {
  title: 'Title details — WhereToStream',
  description: 'Ratings, cast and full streaming availability for this title, country by country.',
};

export default async function TitlePage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const route = parseTitleRouteParams(await params);
  if (!route) {
    notFound();
  }
  return (
    <Suspense fallback={null}>
      <TitleView type={route.type} id={route.id} />
    </Suspense>
  );
}
