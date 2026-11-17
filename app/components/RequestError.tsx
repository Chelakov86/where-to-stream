'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { ClientRequestError, FAILURE_COPY } from '@/app/utils/clientErrors';

interface RequestErrorProps {
  failure: ClientRequestError | null;
  message: string;
  reload: () => void;
  fallbackTitle: string;
  searchHref?: string;
  heading?: boolean;
}

/** Shared recovery UI; the resource hook independently enforces the retry deadline. */
export default function RequestError({
  failure,
  message,
  reload,
  fallbackTitle,
  searchHref = '/',
  heading = false,
}: RequestErrorProps) {
  const [now, setNow] = useState(Date.now);
  const retryAt = failure?.retryAt;
  useEffect(() => {
    if (!retryAt || retryAt <= Date.now()) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= retryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const waiting = !!retryAt && now < retryAt;
  const title = failure ? FAILURE_COPY[failure.kind].title : fallbackTitle;
  const Heading = heading ? 'h1' : 'h2';
  const notFound = failure?.kind === 'not-found';
  return (
    <section
      role="alert"
      className="rounded-lg border border-destructive/35 bg-card px-5 py-10 text-center shadow-sm"
    >
      <Heading className="font-display text-xl font-semibold">{title}</Heading>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {waiting && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          Try again in {Math.max(1, Math.ceil((retryAt - now) / 1000))} seconds.
        </p>
      )}
      <div className="mt-5 flex justify-center gap-2">
        {!notFound && (
          <Button onClick={reload} disabled={waiting}>
            {waiting ? 'Please wait' : 'Try again'}
          </Button>
        )}
        {(heading || notFound) && (
          <Button variant="outline" asChild>
            <Link href={searchHref}>Back to search</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
