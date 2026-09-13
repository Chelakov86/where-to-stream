import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check, Globe2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import CountryFlag from '@/app/components/CountryFlag';
import { OfferKind, ProviderRef, TitleDetails } from '@/app/types';
import { VerdictStatus, verdictFor } from '@/app/utils/availability';
import { getCountryName } from '@/app/utils/countries';
import { pluralize } from '@/app/utils/format';
import { cn } from '@/app/utils/cn';

interface AvailabilityPanelProps {
  title: TitleDetails;
  country: string;
  services: number[];
}

const GROUPS: { key: OfferKind; label: string; note: string }[] = [
  { key: 'flatrate', label: 'Stream with a subscription', note: 'Included in the plan' },
  { key: 'free', label: 'Free & ad-supported', note: 'No subscription needed' },
  { key: 'rent', label: 'Rent', note: 'One-off payment' },
  { key: 'buy', label: 'Buy', note: 'Own it' },
];

export const VERDICT_CLASS: Record<VerdictStatus, string> = {
  mine: 'bg-success/15 text-success border-success/30',
  free: 'bg-success/15 text-success border-success/30',
  stream: 'bg-primary/15 text-primary border-primary/30',
  paid: 'bg-muted text-muted-foreground border-border',
  unavailable: 'bg-destructive/15 text-destructive border-destructive/30',
  nodata: 'bg-muted text-muted-foreground border-border',
};

const ProviderList: React.FC<{
  providers: ProviderRef[];
  services: number[];
  link?: string;
}> = ({ providers, services, link }) => (
  <ul className="flex flex-wrap gap-2">
    {providers.map((provider) => {
      const mine = services.includes(provider.id);
      const className = cn(
        'flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors',
        mine ? 'border-success/40 bg-success/10' : 'border-border bg-card hover:border-primary/40'
      );
      const content = (
        <>
          {provider.logoUrl ? (
            <Image
              src={provider.logoUrl}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-lg"
            />
          ) : (
            <span className="size-8 rounded-lg bg-muted" />
          )}
          <span className="text-sm">{provider.name}</span>
          {mine && (
            <>
              <Check className="size-3.5 text-success" aria-hidden="true" />
              <span className="sr-only">(one of your services)</span>
            </>
          )}
          {link && <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />}
        </>
      );
      return (
        <li key={provider.id}>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              aria-label={`Watch on ${provider.name} (opens in a new tab)`}
            >
              {content}
            </a>
          ) : (
            <span className={className}>{content}</span>
          )}
        </li>
      );
    })}
  </ul>
);

/**
 * "Where to watch" section of a title page: a verdict for the user's country and
 * services, the offers grouped by kind, and a link to compare every country.
 */
const AvailabilityPanel: React.FC<AvailabilityPanelProps> = ({ title, country, services }) => {
  const verdict = verdictFor(title.availability, country, services);
  const entry = verdict.entry;
  const countryCount = Object.keys(title.availability).length;
  const compareHref = `/title/${title.type}/${title.id}/countries?country=${country}`;

  return (
    <section
      aria-labelledby="availability-heading"
      className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="availability-heading"
          className="flex items-center gap-2 font-display text-lg font-semibold"
        >
          Where to watch in {getCountryName(country)}
          <CountryFlag code={country} />
        </h2>
        {countryCount > 0 && (
          <Link
            href={compareHref}
            className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            <Globe2 className="size-4" aria-hidden="true" />
            Compare {pluralize(countryCount, 'country', 'countries')}
          </Link>
        )}
      </div>

      <p
        className={cn(
          'mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
          VERDICT_CLASS[verdict.status]
        )}
        role="status"
      >
        <span>{verdict.label}</span>
        <span className="font-normal opacity-90">{verdict.detail}</span>
      </p>

      {entry ? (
        <div className="mt-4 space-y-4">
          {GROUPS.map((group) =>
            entry[group.key].length > 0 ? (
              <div key={group.key}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label} · {group.note}
                </h3>
                <ProviderList
                  providers={entry[group.key]}
                  services={services}
                  link={entry.watchLink}
                />
              </div>
            ) : null
          )}
          <p className="text-xs text-muted-foreground">
            Availability data from TMDB / JustWatch. Prices and line-ups can change without notice.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          {countryCount > 0 ? (
            <Button asChild variant="outline">
              <Link href={compareHref}>
                See the {pluralize(countryCount, 'country', 'countries')} that carry it
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              No streaming, rental or purchase options are listed for this title anywhere yet.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default AvailabilityPanel;
