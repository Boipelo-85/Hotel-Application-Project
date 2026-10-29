import axios from 'axios';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

// Cache for geocoding results to respect Nominatim's usage policy
const geocodeCache = new Map<string, GeocodeResult>();
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Geocode an address or destination using Nominatim (OpenStreetMap)
 * This function respects Nominatim's usage policy by:
 * - Caching results
 * - Enforcing a minimum interval between requests
 * - Using a proper User-Agent
 *
 * @param address - The address or destination to geocode
 * @returns GeocodeResult with latitude, longitude, and display name
 * @throws Error if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  // Check cache first
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address)!;
  }

  // Respect rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  try {
    const response = await axios.get<NominatimResponse[]>('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'Hotel-Application/1.0 (https://github.com/yourusername/hotel-app)',
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    lastRequestTime = Date.now();

    if (!response.data || response.data.length === 0) {
      throw new Error(`Address not found: ${address}`);
    }

    const result = response.data[0];
    const geocodeResult: GeocodeResult = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };

    // Cache the result
    geocodeCache.set(address, geocodeResult);

    return geocodeResult;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Geocoding request timed out. Please try again.');
      }
      if (error.response?.status === 429) {
        throw new Error('Too many geocoding requests. Please wait a moment and try again.');
      }
      if (error.response?.status && error.response.status >= 500) {
        throw new Error('Geocoding service is temporarily unavailable. Please try again later.');
      }
      if (!error.response) {
        throw new Error('Network error. Please check your connection and try again.');
      }
    }
    throw new Error(`Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clear the geocoding cache (useful for testing or forcing fresh results)
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}
