'use client';

import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import CountryFlag from '@/app/components/CountryFlag';
import { usePinnedCountries } from '@/app/hooks/usePreferences';
import { COUNTRY_NAMES, getCountryName } from '@/app/utils/countries';

interface CountryPickerProps {
  country: string;
  onChange: (code: string) => void;
}

const ALL_COUNTRIES = Object.keys(COUNTRY_NAMES).sort((a, b) =>
  COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b])
);

/**
 * Searchable country combobox with the user's pinned countries listed first.
 */
const CountryPicker: React.FC<CountryPickerProps> = ({ country, onChange }) => {
  const [open, setOpen] = useState(false);
  const { pinned } = usePinnedCountries();

  const rest = useMemo(() => ALL_COUNTRIES.filter((code) => !pinned.includes(code)), [pinned]);

  const renderItem = (code: string) => (
    <CommandItem
      key={code}
      value={`${code} ${getCountryName(code)}`}
      onSelect={() => {
        onChange(code);
        setOpen(false);
      }}
    >
      <CountryFlag code={code} />
      <span className="flex-1 truncate">{getCountryName(code)}</span>
      {code === country && <Check className="text-primary" aria-hidden="true" />}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Country: ${getCountryName(country)}. Change country`}
        >
          <Globe className="text-primary md:hidden" aria-hidden="true" />
          <CountryFlag code={country} className="hidden md:block" />
          <span className="hidden max-w-32 truncate md:inline">{getCountryName(country)}</span>
          <ChevronsUpDown className="hidden opacity-60 md:block" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search countries…" />
          <CommandList>
            <CommandEmpty>No matching country.</CommandEmpty>
            {pinned.length > 0 && (
              <CommandGroup heading="Pinned">{pinned.map(renderItem)}</CommandGroup>
            )}
            <CommandGroup heading="All countries">{rest.map(renderItem)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CountryPicker;
