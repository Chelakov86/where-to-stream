import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CountriesView from '@/app/views/CountriesView';
import { parseTitleRouteParams } from '@/app/utils/titleRoute';
import { getMovieDetails, getTvDetails } from '@/app/tmdbApi';
import { normalizeTmdbMedia } from '@/app/titleNormalizer';

const FALLBACK_METADATA: Metadata = {
  title: 'Availability by country — WhereToStream',
  description:
    'Compare streaming, rental and purchase availability for this title across every country.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const route = parseTitleRouteParams(await params);
  if (!route) {
    return FALLBACK_METADATA;
  }

  try {
    const details =
      route.type === 'movie' ? await getMovieDetails(route.id) : await getTvDetails(route.id);
    const { title } = normalizeTmdbMedia(details, route.type);
    if (!title) {
      return FALLBACK_METADATA;
    }
    return {
      title: `${title} — availability by country — WhereToStream`,
      description: FALLBACK_METADATA.description,
    };
  } catch {
    return FALLBACK_METADATA;
  }
}

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
