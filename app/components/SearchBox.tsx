'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  returnTo?: string;
  onOpen?: () => void;
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
const SearchBox: React.FC<SearchBoxProps> = ({ value, onChange, country, returnTo, onOpen }) => {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [popup, setPopup] = useState({ above: false, maxHeight: 384 });
  const { autocompleteSuggestions, isLoading, handleAutocompleteRequest, clearAutocomplete } =
    useAutocomplete();
  const { history } = useSearchHistory();

  // Follow external query changes (back/forward, reset) without fighting typing
  useEffect(() => {
    setText((current) => (current.trim() === value ? current : value));
  }, [value]);

  useEffect(() => {
    if (text.trim() === value) return;
    commitTimer.current = setTimeout(() => onChange(text.trim()), COMMIT_DELAY_MS);
    return () => {
      if (commitTimer.current !== null) clearTimeout(commitTimer.current);
    };
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

  useLayoutEffect(() => {
    if (!expanded) return;
    const updateBounds = (event?: Event) => {
      if (event?.target === listRef.current) return;
      const box = boxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      // Leave an 8px gap at both the input and visible viewport edges.
      const below = Math.max(0, bottom - rect.bottom - 16);
      const above = Math.max(0, rect.top - top - 16);
      const placeAbove = below < 192 && above > below;
      setPopup({ above: placeAbove, maxHeight: Math.min(384, placeAbove ? above : below) });
    };
    updateBounds();
    const observer = new ResizeObserver(() => updateBounds());
    if (boxRef.current) observer.observe(boxRef.current);
    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, true);
    window.visualViewport?.addEventListener('resize', updateBounds);
    window.visualViewport?.addEventListener('scroll', updateBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds, true);
      window.visualViewport?.removeEventListener('resize', updateBounds);
      window.visualViewport?.removeEventListener('scroll', updateBounds);
    };
  }, [expanded]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!expanded || !list) return;
    if (activeIndex < 0) {
      list.scrollTop = 0;
      return;
    }
    const option = list.children[activeIndex];
    if (!option) return;
    // Scroll only the list; scrollIntoView can also move the page/input.
    const bounds = list.getBoundingClientRect();
    const active = option.getBoundingClientRect();
    if (active.top < bounds.top) list.scrollTop -= bounds.top - active.top;
    else if (active.bottom > bounds.bottom) list.scrollTop += active.bottom - bounds.bottom;
  }, [activeIndex, expanded, options.length, popup.maxHeight, popup.above]);

  const openTitle = (option: Option) => {
    // A delayed search navigation must not replace the selected title route.
    if (commitTimer.current !== null) clearTimeout(commitTimer.current);
    setOpen(false);
    onOpen?.();
    router.push(titleHref(option.type, option.id, country, returnTo));
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
        event.preventDefault();
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
          'absolute z-50 flex w-full flex-col overflow-hidden rounded-lg border border-border bg-popover p-1.5 shadow-xl',
          popup.above ? 'bottom-full mb-2' : 'top-full mt-2',
          !expanded && 'hidden'
        )}
        style={{ maxHeight: popup.maxHeight }}
      >
        {showingRecent && (
          <p className="shrink-0 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recently viewed
          </p>
        )}
        <ul
          ref={listRef}
          id={LISTBOX_ID}
          className="min-h-0 overflow-y-auto overscroll-contain"
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
