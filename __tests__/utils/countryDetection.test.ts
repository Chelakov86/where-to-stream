import { detectUserCountry, validateCountryCode } from '@/app/utils/countryDetection';

describe('countryDetection', () => {
  describe('detectUserCountry', () => {
    it('should detect country from x-vercel-ip-country header', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': 'US',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('US');
    });

    it('should detect country from cf-ipcountry header', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'cf-ipcountry': 'GB',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('GB');
    });

    it('should detect country from cloudfront-viewer-country header', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'cloudfront-viewer-country': 'DE',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('DE');
    });

    it('should detect country from x-country-code header (Netlify)', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-country-code': 'CA',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('CA');
    });

    it('should detect country from fastly-client-geo-country-code header', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'fastly-client-geo-country-code': 'FR',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('FR');
    });

    it('should prioritize x-vercel-ip-country over other headers', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': 'US',
          'cf-ipcountry': 'GB',
          'cloudfront-viewer-country': 'DE',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('US');
    });

    it('should fall back to cf-ipcountry if x-vercel-ip-country is not present', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'cf-ipcountry': 'GB',
          'cloudfront-viewer-country': 'DE',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('GB');
    });

    it('should return null when no country header is present', () => {
      const request = new Request('http://localhost:3000', {
        headers: {},
      });

      const result = detectUserCountry(request);
      expect(result).toBeNull();
    });

    it('should normalize lowercase country codes to uppercase', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': 'us',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('US');
    });

    it('should normalize mixed case country codes to uppercase', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': 'uS',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('US');
    });

    it('should trim whitespace from country code', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': '  US  ',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBe('US');
    });

    it('should return null for invalid country code (not 2 letters)', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': 'USA',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBeNull();
    });

    it('should return null for invalid country code (single character)', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': 'U',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBeNull();
    });

    it('should return null for invalid country code (numbers)', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': '12',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBeNull();
    });

    it('should return null for empty string header value', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': '',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only header value', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': '   ',
        },
      });

      const result = detectUserCountry(request);
      expect(result).toBeNull();
    });
  });

  describe('validateCountryCode', () => {
    const availableCountries = ['US', 'GB', 'DE', 'CA', 'FR'];

    it('should return validated country code when it exists in available countries', () => {
      const result = validateCountryCode('US', availableCountries);
      expect(result).toBe('US');
    });

    it('should return null when country code is not in available countries', () => {
      const result = validateCountryCode('XY', availableCountries);
      expect(result).toBeNull();
    });

    it('should return null when detected code is null', () => {
      const result = validateCountryCode(null, availableCountries);
      expect(result).toBeNull();
    });

    it('should be case-insensitive when validating against available countries', () => {
      const result = validateCountryCode('us', availableCountries);
      expect(result).toBe('US');
    });

    it('should handle lowercase available countries', () => {
      const lowercaseAvailable = ['us', 'gb', 'de', 'ca', 'fr'];
      const result = validateCountryCode('US', lowercaseAvailable);
      expect(result).toBe('US');
    });

    it('should handle mixed case available countries', () => {
      const mixedCaseAvailable = ['Us', 'Gb', 'dE', 'cA', 'FR'];
      const result = validateCountryCode('us', mixedCaseAvailable);
      expect(result).toBe('US');
    });

    it('should return null when available countries list is empty', () => {
      const result = validateCountryCode('US', []);
      expect(result).toBeNull();
    });

    it('should validate all countries in available list', () => {
      availableCountries.forEach((countryCode) => {
        const result = validateCountryCode(countryCode, availableCountries);
        expect(result).toBe(countryCode);
      });
    });

    it('should return null for country codes not in TMDB results', () => {
      // CU (Cuba) might not be in TMDB's available countries
      const result = validateCountryCode('CU', availableCountries);
      expect(result).toBeNull();
    });
  });

  describe('integration: detectUserCountry + validateCountryCode', () => {
    it('should detect and validate a valid country code', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': 'US',
        },
      });

      const detectedCode = detectUserCountry(request);
      const validatedCode = validateCountryCode(detectedCode, ['US', 'GB', 'DE']);

      expect(validatedCode).toBe('US');
    });

    it('should detect but reject invalid country code', () => {
      const request = new Request('http://localhost:3000', {
        headers: {
          'x-vercel-ip-country': 'XY',
        },
      });

      const detectedCode = detectUserCountry(request);
      const validatedCode = validateCountryCode(detectedCode, ['US', 'GB', 'DE']);

      expect(detectedCode).toBe('XY');
      expect(validatedCode).toBeNull();
    });

    it('should handle no detection and no validation', () => {
      const request = new Request('http://localhost:3000', {
        headers: {},
      });

      const detectedCode = detectUserCountry(request);
      const validatedCode = validateCountryCode(detectedCode, ['US', 'GB', 'DE']);

      expect(detectedCode).toBeNull();
      expect(validatedCode).toBeNull();
    });
  });
});
