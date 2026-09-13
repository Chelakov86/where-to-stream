import { MediaType } from '@/app/types';

/**
 * Validates `/title/[type]/[id]` route params.
 *
 * @returns The typed params, or null when the type or id is invalid
 */
export function parseTitleRouteParams(params: {
  type: string;
  id: string;
}): { type: MediaType; id: number } | null {
  if (params.type !== 'movie' && params.type !== 'tv') {
    return null;
  }
  if (!/^\d+$/.test(params.id)) {
    return null;
  }
  const id = parseInt(params.id, 10);
  return id > 0 ? { type: params.type, id } : null;
}
