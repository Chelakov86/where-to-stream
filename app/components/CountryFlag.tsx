import React from 'react';
import Image from 'next/image';
import { getCountryFlagUrl } from '@/app/utils/countries';
import { cn } from '@/app/utils/cn';

interface CountryFlagProps {
  code: string;
  className?: string;
}

/**
 * Decorative flag image for a country code. Images are used instead of emoji
 * flags because Windows does not render flag emoji.
 */
const CountryFlag: React.FC<CountryFlagProps> = ({ code, className }) => {
  const src = getCountryFlagUrl(code);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt=""
      width={20}
      height={14}
      className={cn('h-3.5 w-5 shrink-0 rounded-[2px] object-cover', className)}
    />
  );
};

export default CountryFlag;
