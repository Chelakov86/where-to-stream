/**
 * Availability Mapper Module
 *
 * Transforms TMDB watch provider data into a structured availability model
 * that groups countries by preference and normalizes provider information.
 *
 * Key Features:
 * - Groups countries into "preferred" (DE, GB, US, CA) and "other" categories
 * - Detects Netflix availability by provider name matching
 * - Extracts free/ad-supported providers from flatrate providers
 * - Maps country codes to full country names with fallback to code
 * - Always includes preferred countries in results (even if no providers)
 *
 * Assumptions:
 * - Netflix detection: Uses provider name matching ("Netflix"). A more robust
 *   solution could use TMDB provider IDs (e.g., 8, 1773) but name matching
 *   is simpler and works for most cases.
 * - Preferred countries order: Fixed order [DE, GB, US, CA] as defined in config.
 *   This order is preserved in the output.
 * - Country name mapping: Uses ISO 3166-1 alpha-2 codes. If a code is not found
 *   in the mapping, the code itself is used as the display name.
 * - Free/ad-supported providers: Currently extracted from the `flatrate` category
 *   only. The `ads` and `free` categories from TMDB are not included in the
 *   current implementation.
 * - Other countries: Only included if they have at least one provider (Netflix
 *   or free/ad-supported). Countries with only buy/rent options are excluded.
 */

import { PREFERRED_COUNTRIES } from './config';
import { TmdbWatchProviderInfo, TmdbWatchProvidersResponse } from './tmdbTypes';

// --- Internal Availability Model ---

export interface CountryAvailability {
  countryCode: string;
  countryName: string;
  hasNetflix: boolean;
  freeOrAdsProviders: string[];
  watchLink?: string;
}

export interface AvailabilityResult {
  preferredCountries: CountryAvailability[];
  otherCountries: CountryAvailability[];
}

// --- Constants ---

/**
 * Netflix provider name for detection.
 * Note: A more robust solution could use TMDB provider IDs (e.g., 8, 1773),
 * but name matching is simpler and works for most cases.
 */
const NETFLIX_PROVIDER_NAME = 'Netflix';
// Alternative approach: const NETFLIX_PROVIDER_IDS = new Set([8, 1773]);

// Comprehensive map of ISO 3166-1 alpha-2 country codes to full country names
const COUNTRY_NAMES: Record<string, string> = {
  AD: 'Andorra',
  AE: 'United Arab Emirates',
  AF: 'Afghanistan',
  AG: 'Antigua and Barbuda',
  AI: 'Anguilla',
  AL: 'Albania',
  AM: 'Armenia',
  AO: 'Angola',
  AQ: 'Antarctica',
  AR: 'Argentina',
  AS: 'American Samoa',
  AT: 'Austria',
  AU: 'Australia',
  AW: 'Aruba',
  AX: 'Åland Islands',
  AZ: 'Azerbaijan',
  BA: 'Bosnia and Herzegovina',
  BB: 'Barbados',
  BD: 'Bangladesh',
  BE: 'Belgium',
  BF: 'Burkina Faso',
  BG: 'Bulgaria',
  BH: 'Bahrain',
  BI: 'Burundi',
  BJ: 'Benin',
  BL: 'Saint Barthélemy',
  BM: 'Bermuda',
  BN: 'Brunei',
  BO: 'Bolivia',
  BQ: 'Caribbean Netherlands',
  BR: 'Brazil',
  BS: 'Bahamas',
  BT: 'Bhutan',
  BV: 'Bouvet Island',
  BW: 'Botswana',
  BY: 'Belarus',
  BZ: 'Belize',
  CA: 'Canada',
  CC: 'Cocos Islands',
  CD: 'Democratic Republic of the Congo',
  CF: 'Central African Republic',
  CG: 'Republic of the Congo',
  CH: 'Switzerland',
  CI: 'Ivory Coast',
  CK: 'Cook Islands',
  CL: 'Chile',
  CM: 'Cameroon',
  CN: 'China',
  CO: 'Colombia',
  CR: 'Costa Rica',
  CU: 'Cuba',
  CV: 'Cape Verde',
  CW: 'Curaçao',
  CX: 'Christmas Island',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DJ: 'Djibouti',
  DK: 'Denmark',
  DM: 'Dominica',
  DO: 'Dominican Republic',
  DZ: 'Algeria',
  EC: 'Ecuador',
  EE: 'Estonia',
  EG: 'Egypt',
  EH: 'Western Sahara',
  ER: 'Eritrea',
  ES: 'Spain',
  ET: 'Ethiopia',
  FI: 'Finland',
  FJ: 'Fiji',
  FK: 'Falkland Islands',
  FM: 'Micronesia',
  FO: 'Faroe Islands',
  FR: 'France',
  GA: 'Gabon',
  GB: 'United Kingdom',
  GD: 'Grenada',
  GE: 'Georgia',
  GF: 'French Guiana',
  GG: 'Guernsey',
  GH: 'Ghana',
  GI: 'Gibraltar',
  GL: 'Greenland',
  GM: 'Gambia',
  GN: 'Guinea',
  GP: 'Guadeloupe',
  GQ: 'Equatorial Guinea',
  GR: 'Greece',
  GS: 'South Georgia and the South Sandwich Islands',
  GT: 'Guatemala',
  GU: 'Guam',
  GW: 'Guinea-Bissau',
  GY: 'Guyana',
  HK: 'Hong Kong',
  HM: 'Heard Island and McDonald Islands',
  HN: 'Honduras',
  HR: 'Croatia',
  HT: 'Haiti',
  HU: 'Hungary',
  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  IM: 'Isle of Man',
  IN: 'India',
  IO: 'British Indian Ocean Territory',
  IQ: 'Iraq',
  IR: 'Iran',
  IS: 'Iceland',
  IT: 'Italy',
  JE: 'Jersey',
  JM: 'Jamaica',
  JO: 'Jordan',
  JP: 'Japan',
  KE: 'Kenya',
  KG: 'Kyrgyzstan',
  KH: 'Cambodia',
  KI: 'Kiribati',
  KM: 'Comoros',
  KN: 'Saint Kitts and Nevis',
  KP: 'North Korea',
  KR: 'South Korea',
  KW: 'Kuwait',
  KY: 'Cayman Islands',
  KZ: 'Kazakhstan',
  LA: 'Laos',
  LB: 'Lebanon',
  LC: 'Saint Lucia',
  LI: 'Liechtenstein',
  LK: 'Sri Lanka',
  LR: 'Liberia',
  LS: 'Lesotho',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  LY: 'Libya',
  MA: 'Morocco',
  MC: 'Monaco',
  MD: 'Moldova',
  ME: 'Montenegro',
  MF: 'Saint Martin',
  MG: 'Madagascar',
  MH: 'Marshall Islands',
  MK: 'North Macedonia',
  ML: 'Mali',
  MM: 'Myanmar',
  MN: 'Mongolia',
  MO: 'Macao',
  MP: 'Northern Mariana Islands',
  MQ: 'Martinique',
  MR: 'Mauritania',
  MS: 'Montserrat',
  MT: 'Malta',
  MU: 'Mauritius',
  MV: 'Maldives',
  MW: 'Malawi',
  MX: 'Mexico',
  MY: 'Malaysia',
  MZ: 'Mozambique',
  NA: 'Namibia',
  NC: 'New Caledonia',
  NE: 'Niger',
  NF: 'Norfolk Island',
  NG: 'Nigeria',
  NI: 'Nicaragua',
  NL: 'Netherlands',
  NO: 'Norway',
  NP: 'Nepal',
  NR: 'Nauru',
  NU: 'Niue',
  NZ: 'New Zealand',
  OM: 'Oman',
  PA: 'Panama',
  PE: 'Peru',
  PF: 'French Polynesia',
  PG: 'Papua New Guinea',
  PH: 'Philippines',
  PK: 'Pakistan',
  PL: 'Poland',
  PM: 'Saint Pierre and Miquelon',
  PN: 'Pitcairn',
  PR: 'Puerto Rico',
  PS: 'Palestine',
  PT: 'Portugal',
  PW: 'Palau',
  PY: 'Paraguay',
  QA: 'Qatar',
  RE: 'Réunion',
  RO: 'Romania',
  RS: 'Serbia',
  RU: 'Russia',
  RW: 'Rwanda',
  SA: 'Saudi Arabia',
  SB: 'Solomon Islands',
  SC: 'Seychelles',
  SD: 'Sudan',
  SE: 'Sweden',
  SG: 'Singapore',
  SH: 'Saint Helena',
  SI: 'Slovenia',
  SJ: 'Svalbard and Jan Mayen',
  SK: 'Slovakia',
  SL: 'Sierra Leone',
  SM: 'San Marino',
  SN: 'Senegal',
  SO: 'Somalia',
  SR: 'Suriname',
  SS: 'South Sudan',
  ST: 'São Tomé and Príncipe',
  SV: 'El Salvador',
  SX: 'Sint Maarten',
  SY: 'Syria',
  SZ: 'Eswatini',
  TC: 'Turks and Caicos Islands',
  TD: 'Chad',
  TF: 'French Southern Territories',
  TG: 'Togo',
  TH: 'Thailand',
  TJ: 'Tajikistan',
  TK: 'Tokelau',
  TL: 'Timor-Leste',
  TM: 'Turkmenistan',
  TN: 'Tunisia',
  TO: 'Tonga',
  TR: 'Turkey',
  TT: 'Trinidad and Tobago',
  TV: 'Tuvalu',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  UA: 'Ukraine',
  UG: 'Uganda',
  UM: 'United States Minor Outlying Islands',
  US: 'United States',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',
  VA: 'Vatican City',
  VC: 'Saint Vincent and the Grenadines',
  VE: 'Venezuela',
  VG: 'British Virgin Islands',
  VI: 'United States Virgin Islands',
  VN: 'Vietnam',
  VU: 'Vanuatu',
  WF: 'Wallis and Futuna',
  WS: 'Samoa',
  XK: 'Kosovo',
  YE: 'Yemen',
  YT: 'Mayotte',
  ZA: 'South Africa',
  ZM: 'Zambia',
  ZW: 'Zimbabwe',
};

// --- Helper Functions ---

/**
 * Maps ISO 3166-1 alpha-2 country code to full country name.
 * Falls back to the code itself if not found in the mapping.
 */
const getCountryName = (code: string): string => COUNTRY_NAMES[code] || code;

/**
 * Checks if Netflix is available in the given provider list.
 * Uses provider name matching (case-sensitive).
 */
const hasNetflix = (providers: TmdbWatchProviderInfo[] = []): boolean => {
  return providers.some((p) => p.provider_name === NETFLIX_PROVIDER_NAME);
};

/**
 * Extracts unique provider names from flatrate providers and returns them sorted.
 * This represents free/ad-supported streaming providers.
 * Note: Currently only uses flatrate category; ads and free categories are not included.
 */
const getFreeOrAdsProviders = (flatrateProviders: TmdbWatchProviderInfo[] = []): string[] => {
  const providers = new Set<string>();
  flatrateProviders.forEach((p) => providers.add(p.provider_name));
  return Array.from(providers).sort();
};

// --- Mapper ---

/**
 * Maps TMDB watch providers response to a structured availability model.
 *
 * Processing steps:
 * 1. Process preferred countries (DE, GB, US, CA) in order - always included even if no providers
 * 2. Process other countries - only included if they have Netflix or free/ad-supported providers
 * 3. Sort other countries alphabetically by country name
 *
 * @param tmdbProviders - Raw watch providers response from TMDB API
 * @returns AvailabilityResult with preferredCountries and otherCountries arrays
 */
export const mapAvailability = (tmdbProviders: TmdbWatchProvidersResponse): AvailabilityResult => {
  const tmdbResults = tmdbProviders.results || {};
  const preferredCountries: CountryAvailability[] = [];
  const otherCountries: CountryAvailability[] = [];

  const processedPreferred = new Set<string>();

  // 1. Process preferred countries
  for (const countryCode of PREFERRED_COUNTRIES) {
    const countryData = tmdbResults[countryCode];
    const allProviders = [
      ...(countryData?.flatrate || []),
      // ...(countryData?.ads || []), // Removed
      // ...(countryData?.free || []), // Removed
    ];

    preferredCountries.push({
      countryCode,
      countryName: getCountryName(countryCode),
      hasNetflix: hasNetflix(allProviders),
      freeOrAdsProviders: getFreeOrAdsProviders(countryData?.flatrate), // Changed
      watchLink: countryData?.link,
    });
    processedPreferred.add(countryCode);
  }

  // 2. Process other countries
  for (const countryCode in tmdbResults) {
    if (processedPreferred.has(countryCode)) {
      continue;
    }

    const countryData = tmdbResults[countryCode];
    const flatrateProviders = countryData?.flatrate || [];
    const allProviders = [
      ...flatrateProviders,
      // ...(countryData?.ads || []), // Removed
      // ...(countryData?.free || []), // Removed
      ...(countryData?.buy || []),
      ...(countryData?.rent || []),
    ];

    // Only include countries with Netflix or free/ad-supported services
    const hasNetflixAvailability = hasNetflix(allProviders);
    const freeProviders = getFreeOrAdsProviders(flatrateProviders);
    
    if (hasNetflixAvailability || freeProviders.length > 0) {
      otherCountries.push({
        countryCode,
        countryName: getCountryName(countryCode),
        hasNetflix: hasNetflixAvailability,
        freeOrAdsProviders: freeProviders,
        watchLink: countryData?.link,
      });
    }
  }

  // 3. Sort other countries by name
  otherCountries.sort((a, b) => a.countryName.localeCompare(b.countryName));

  return {
    preferredCountries,
    otherCountries,
  };
};
