import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export interface AutocompleteItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  year?: number;
  posterUrl?: string;
}

export interface AutocompleteListProps {
  items: AutocompleteItem[];
  isOpen: boolean;
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
  id?: string;
  highlightedIndex?: number;
  onHighlightChange?: (index: number) => void;
}

export const AutocompleteList: React.FC<AutocompleteListProps> = ({
  items,
  isOpen,
  onSelect,
  onClose,
  id,
  highlightedIndex: controlledHighlightedIndex,
  onHighlightChange,
}) => {
  const [internalHighlightedIndex, setInternalHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Use controlled index if provided, otherwise use internal state
  const highlightedIndex =
    controlledHighlightedIndex !== undefined
      ? controlledHighlightedIndex
      : internalHighlightedIndex;

  const setHighlightedIndex = (index: number) => {
    if (onHighlightChange) {
      onHighlightChange(index);
    } else {
      setInternalHighlightedIndex(index);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex] && listRef.current) {
      const element = itemRefs.current[highlightedIndex];
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  // Removed auto-focus to prevent stealing focus from input field
  // Focus will be managed through keyboard navigation only

  const handleKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((highlightedIndex + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        const newIndex = highlightedIndex <= 0 ? items.length - 1 : highlightedIndex - 1;
        setHighlightedIndex(newIndex);
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
          onSelect(items[highlightedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  };

  if (!isOpen || items.length === 0) {
    return null;
  }

  return (
    <ul
      id={id}
      ref={listRef}
      className="custom-scrollbar max-h-80 w-full overflow-y-auto rounded-xl border border-white/[0.14] bg-[#10151d]/95 p-1 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      role="listbox"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition ${
            index === highlightedIndex
              ? 'bg-accent-primary/[0.14] text-text'
              : 'text-text-secondary hover:bg-white/[0.06] hover:text-text'
          }`}
          onMouseEnter={() => setHighlightedIndex(index)}
          onClick={() => onSelect(item)}
          role="option"
          aria-selected={index === highlightedIndex}
        >
          {item.posterUrl ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              width={44}
              height={66}
              className="h-[66px] w-11 rounded-md object-cover shadow-lg shadow-black/30"
            />
          ) : (
            <div className="grid h-[66px] w-11 place-items-center rounded-md border border-white/10 bg-white/[0.06]">
              <span className="text-[10px] font-bold uppercase text-text-secondary">No art</span>
            </div>
          )}
          <div className="min-w-0 flex-grow">
            <p className="truncate text-sm font-black text-inherit">{item.title}</p>
            <div className="mt-1 flex items-center gap-2 text-xs font-bold text-text-secondary">
              <span>{item.year || 'Unknown year'}</span>
              <span className="h-1 w-1 rounded-full bg-text-secondary/50" />
              <span className="uppercase tracking-[0.12em]">
                {item.type === 'movie' ? 'Movie' : 'Series'}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};
