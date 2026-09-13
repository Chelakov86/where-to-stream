import { Suspense } from 'react';
import SearchView from '@/app/views/SearchView';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}
