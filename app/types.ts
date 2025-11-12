export interface NormalizedSearchResult {
  id: number;
  type: "movie" | "tv";
  title: string;
  year?: number;
  posterUrl?: string;
  rating?: number;
  genres?: number[];
  overview?: string;
  popularity?: number;
}

export interface ResultsListProps {
  results: NormalizedSearchResult[];
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  onSelectResult: (result: NormalizedSearchResult) => void;
}
