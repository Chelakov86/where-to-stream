import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CountriesView from '@/app/views/CountriesView';
import { parseTitleRouteParams } from '@/app/utils/titleRoute';

export const metadata: Metadata = {
  title: 'Availability by country — WhereToStream',
  description:
    'Compare streaming, rental and purchase availability for this title across every country.',
};

export default async function CountriesPage({
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
      <CountriesView type={route.type} id={route.id} />
    </Suspense>
  );
}
