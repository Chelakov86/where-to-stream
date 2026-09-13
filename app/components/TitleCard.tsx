import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { MediaType } from '@/app/types';
import { titleHref } from '@/app/utils/searchPageState';
import { cn } from '@/app/utils/cn';

interface TitleCardProps {
  title: {
    id: number;
    type: MediaType;
    title: string;
    year?: number;
    posterUrl?: string;
    rating?: number;
  };
  country: string;
  className?: string;
}

/**
 * Poster card linking to a title's detail page.
 */
const TitleCard: React.FC<TitleCardProps> = ({ title, country, className }) => {
  const typeLabel = title.type === 'tv' ? 'Series' : 'Film';

  return (
    <Link
      href={titleHref(title.type, title.id, country)}
      className={cn(
        'group flex flex-col rounded-lg transition-transform duration-200 hover:-translate-y-0.5',
        className
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted shadow-md">
        {title.posterUrl ? (
          <Image
            src={title.posterUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 sm:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            No poster
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-md border border-border bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground backdrop-blur">
          {typeLabel}
        </span>
      </div>

      <div className="mt-2 min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {title.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{title.year ?? '—'}</span>
          {title.rating !== undefined && title.rating > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-primary text-primary" aria-hidden="true" />
              <span className="sr-only">Rating</span>
              {title.rating.toFixed(1)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
};

export default TitleCard;
