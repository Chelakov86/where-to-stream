/**
 * Country detection utilities for automatic user location detection
 * Uses HTTP headers from hosting platforms (Vercel, Cloudflare, AWS, Netlify, Fastly)
 */

/**
 * Platform-specific country detection headers, checked in order of priority
 */
const COUNTRY_HEADERS = [
  'x-vercel-ip-country', // Vercel
  'cf-ipcountry', // Cloudflare
  'cloudfront-viewer-country', // AWS CloudFront
  'x-country-code', // Netlify
  'fastly-client-geo-country-code', // Fastly
] as const;

/**
 * Detects the user's country from HTTP request headers.
 * Checks multiple platform-specific headers in order of priority.
 *
 * @param request - The HTTP request object
 * @returns 2-letter ISO country code (uppercase) or null if detection fails
 *
 * @example
 * const countryCode = detectUserCountry(request);
 * // Returns: "US", "DE", "GB", etc. or null
 */
export function detectUserCountry(request: Request): string | null {
  for (const headerName of COUNTRY_HEADERS) {
    const value = request.headers.get(headerName);

    if (value && typeof value === 'string') {
      const normalizedCode = value.trim().toUpperCase();

      // Basic validation: should be exactly 2 characters
      if (normalizedCode.length === 2 && /^[A-Z]{2}$/.test(normalizedCode)) {
        return normalizedCode;
      }
    }
  }

  return null;
}

/**
 * Validates a detected country code against the list of available countries from TMDB.
 * This ensures we only show countries that actually have streaming data.
 *
 * @param detectedCode - The country code detected from headers (or null)
 * @param availableCountries - Array of country codes that have streaming data from TMDB
 * @returns The validated country code or null if invalid/unavailable
 *
 * @example
 * const validatedCode = validateCountryCode("US", ["US", "GB", "DE"]);
 * // Returns: "US"
 *
 * const invalidCode = validateCountryCode("XY", ["US", "GB", "DE"]);
 * // Returns: null
 */
export function validateCountryCode(
  detectedCode: string | null,
  availableCountries: string[]
): string | null {
  if (!detectedCode) {
    return null;
  }

  // Normalize both the detected code and available countries for comparison
  const normalizedDetected = detectedCode.toUpperCase();
  const normalizedAvailable = availableCountries.map((code) => code.toUpperCase());

  if (normalizedAvailable.includes(normalizedDetected)) {
    return normalizedDetected;
  }

  return null;
}
