'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { History, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useAutocomplete } from '@/app/hooks/useAutocomplete';
import { useSearchHistory } from '@/app/hooks/useSearchHistory';
import { MediaType } from '@/app/types';
import { titleHref } from '@/app/utils/searchPageState';
import { cn } from '@/app/utils/cn';

interface SearchBoxProps {
  value: string;
  onChange: (query: string) => void;
  country: string;
}

interface Option {
  key: string;
  id: number;
  type: MediaType;
  title: string;
  year?: number;
  posterUrl?: string;
}

const COMMIT_DELAY_MS = 400;
const MAX_RECENT = 6;
const LISTBOX_ID = 'search-suggestions';

/**
 * Search combobox. Typing updates the results below after a short pause and
 * suggests matching titles; with an empty field it offers recently viewed titles.
 * Choosing a suggestion opens that title.
 */
const SearchBox: React.FC<SearchBoxProps> = ({ value, onChange, country }) => {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const { autocompleteSuggestions, isLoading, handleAutocompleteRequest, clearAutocomplete } =
    useAutocomplete();
  const { history } = useSearchHistory();

  // Follow external query changes (back/forward, reset) without fighting typing
  useEffect(() => {
    setText((current) => (current.trim() === value ? current : value));
  }, [value]);

  useEffect(() => {
    if (text.trim() === value) return;
    const timer = setTimeout(() => onChange(text.trim()), COMMIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const showingRecent = text.trim().length < 2;
  const options: Option[] = showingRecent
    ? history
        .slice(0, MAX_RECENT)
        .map((item) => ({ ...item, key: `recent-${item.type}-${item.id}` }))
    : autocompleteSuggestions.map((item) => ({ ...item, key: `${item.type}-${item.id}` }));
  const expanded = open && options.length > 0;

  const openTitle = (option: Option) => {
    setOpen(false);
    router.push(titleHref(option.type, option.id, country));
  };

  const handleInput = (next: string) => {
    setText(next);
    setOpen(true);
    setActiveIndex(-1);
    handleAutocompleteRequest(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        if (!expanded) {
          setOpen(true);
          return;
        }
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case 'ArrowUp':
        if (!expanded) return;
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, -1));
        break;
      case 'Enter':
        event.preventDefault();
        if (expanded && options[activeIndex]) {
          openTitle(options[activeIndex]);
          return;
        }
        onChange(text.trim());
        setOpen(false);
        break;
      case 'Escape':
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div ref={boxRef} className="relative text-left">
      <label htmlFor="title-search" className="sr-only">
        Search movies and TV shows
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary"
        aria-hidden="true"
      />
      <input
        id="title-search"
        type="search"
        role="combobox"
        autoComplete="off"
        value={text}
        onChange={(event) => handleInput(event.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search a movie or series…"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={
          expanded && options[activeIndex] ? `${LISTBOX_ID}-${activeIndex}` : undefined
        }
        className="h-14 w-full rounded-lg border border-input bg-card pl-12 pr-12 text-base text-foreground shadow-lg outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-ring/35 [&::-webkit-search-cancel-button]:hidden"
      />
      {isLoading && !showingRecent ? (
        <Loader2
          className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      ) : text ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setText('');
            clearAutocomplete();
            onChange('');
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 size-9 -translate-y-1/2"
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}

      <div
        className={cn(
          'absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover p-1.5 shadow-xl',
          !expanded && 'hidden'
        )}
      >
        {showingRecent && (
          <p className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recently viewed
          </p>
        )}
        <ul
          id={LISTBOX_ID}
          role="listbox"
          aria-label={showingRecent ? 'Recently viewed titles' : 'Title suggestions'}
        >
          {expanded &&
            options.map((option, index) => (
              <li
                key={option.key}
                id={`${LISTBOX_ID}-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openTitle(option)}
                onMouseEnter={() => setActiveIndex(index)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 aria-selected:bg-accent"
              >
                {showingRecent ? (
                  <History className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : option.posterUrl ? (
                  <Image
                    src={option.posterUrl}
                    alt=""
                    width={32}
                    height={48}
                    className="h-12 w-8 rounded-md object-cover"
                  />
                ) : (
                  <span className="h-12 w-8 rounded-md bg-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{option.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {option.type === 'tv' ? 'Series' : 'Film'} · {option.year ?? '—'}
                  </span>
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default SearchBox;
