'use client';

import { usePreferencePersistence } from '@/app/hooks/usePreferences';

/** Kept inside dialogs too, where the surrounding page is hidden from readers. */
export default function PreferenceWarning() {
  const { hasUnsavedChanges } = usePreferencePersistence();
  return (
    <p role="status" className="py-2 text-sm text-muted-foreground empty:hidden">
      {hasUnsavedChanges
        ? 'Some changes are kept only for this session because browser storage is unavailable. They may be lost when you reload or close this page.'
        : null}
    </p>
  );
}
