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
      className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-64 sm:max-h-80 md:max-h-96 overflow-y-auto"
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
          className={`cursor-pointer p-2 flex items-center ${
            index === highlightedIndex ? 'bg-gray-700' : 'hover:bg-gray-700'
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
              width={40}
              height={60}
              className="object-cover w-10 h-15 mr-3 rounded-sm"
            />
          ) : (
            <div className="w-10 h-15 mr-3 bg-gray-700 rounded-sm flex items-center justify-center">
              <span className="text-xs text-gray-400">No Image</span>
            </div>
          )}
          <div className="flex-grow">
            <p className="font-semibold text-white">{item.title}</p>
            <div className="flex items-center text-sm text-gray-400">
              <span>{item.year}</span>
              <span className="mx-2">•</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  item.type === 'movie'
                    ? 'bg-blue-600 text-blue-100'
                    : 'bg-purple-600 text-purple-100'
                }`}
              >
                {item.type === 'movie' ? 'Movie' : 'Series'}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};
