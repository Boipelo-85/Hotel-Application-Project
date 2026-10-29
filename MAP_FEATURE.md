# Map Feature Implementation Guide

This document explains the map feature implementation using OpenStreetMap and Leaflet.

## Overview

The map feature provides:
- **Sidebar Map Card**: A small, non-interactive map showing the area of current search results
- **Full Map View**: A full-screen interactive map with clustered markers for all properties
- **Map-List Synchronization**: Hovering cards highlights markers, clicking markers scrolls to cards
- **Geocoding Service**: Backend service for converting addresses to coordinates using Nominatim

## Database Schema

The `branches` table already includes `latitude` and `longitude` columns (NUMERIC(9,6)). No database migration is needed.

## Frontend Components

### 1. SidebarMapCard
- Location: `frontend/src/components/SidebarMapCard.tsx`
- Shows a small map fitted to bounds of current results
- Non-interactive (dragging and zoom disabled)
- "Show on map" button opens full map view
- Highlights markers when cards are hovered

### 2. FullMapView
- Location: `frontend/src/components/FullMapView.tsx`
- Full-screen modal with interactive map
- Uses Leaflet.markercluster for clustering
- Markers show popups with property details
- Clicking "View Details" closes map and scrolls to card
- Close button to return to list view

### 3. Geocoding Service (Backend)
- Location: `backend/src/services/geocoding.ts`
- Uses Nominatim (OpenStreetMap) for geocoding
- Respects usage policy:
  - 1 request per second maximum
  - Caches results
  - Sends proper User-Agent
- Error handling for timeouts, rate limits, network failures

## API Endpoint

### POST /api/v1/geocode
Geocode an address or destination.

**Request Body:**
```json
{
  "address": "Cape Town, South Africa"
}
```

**Response:**
```json
{
  "latitude": -33.9249,
  "longitude": 18.4241,
  "displayName": "Cape Town, City of Cape Town Metropolitan Municipality, Western Cape, South Africa"
}
```

**Error Responses:**
- `400`: Address is required
- `500`: Geocoding failed (with descriptive message)

## How to Run and Test

### Prerequisites
1. Ensure branches have `latitude` and `longitude` values in the database
2. Backend and frontend must be running

### Testing the Map Feature

1. **Start the application:**
   ```bash
   # Backend
   cd backend
   npm run dev

   # Frontend
   cd frontend
   npm run dev
   ```

2. **Navigate to the Hotels page:**
   - Go to `http://localhost:5173/hotels`
   - Or search from the home page

3. **Test Sidebar Map Card:**
   - The sidebar map should appear above filters if results exist
   - Verify markers are shown for properties with coordinates
   - Click "Show on map" to open full map view

4. **Test Full Map View:**
   - Full map should open in a modal
   - Verify all properties are shown as markers
   - Click a marker to see popup with property details
   - Click "View Details" in popup to close map and scroll to card
   - Click "Close" button to return to list

5. **Test Map-List Synchronization:**
   - Hover over a property card - corresponding marker should change color
   - Hover over a marker - corresponding card should be highlighted (if implemented)
   - Verify filters update both map and list

6. **Test Geocoding (Optional):**
   ```bash
   curl -X POST http://localhost:3000/api/v1/geocode \
     -H "Content-Type: application/json" \
     -d '{"address": "Cape Town, South Africa"}'
   ```

## Adding Coordinates to Properties

Properties need latitude/longitude values to appear on the map. You can:

### Option 1: Manual Update
Update the database directly:
```sql
UPDATE branches
SET latitude = -33.9249, longitude = 18.4241
WHERE id = 'your-branch-id';
```

### Option 2: Use the Geocoding Service
Create a script to geocode all branches without coordinates:
```typescript
import { geocodeAddress } from './services/geocoding.js';
import { pool } from './db.js';

async function geocodeBranches() {
  const result = await pool.query(
    'SELECT id, address, city, province FROM branches WHERE latitude IS NULL OR longitude IS NULL'
  );

  for (const branch of result.rows) {
    try {
      const address = `${branch.address}, ${branch.city}, ${branch.province}`;
      const coords = await geocodeAddress(address);
      await pool.query(
        'UPDATE branches SET latitude = $1, longitude = $2 WHERE id = $3',
        [coords.latitude, coords.longitude, branch.id]
      );
      console.log(`Geocoded ${branch.name}`);
    } catch (error) {
      console.error(`Failed to geocode ${branch.name}:`, error);
    }
  }
}
```

## Responsive Design

On mobile devices:
- Sidebar map card becomes more compact
- Full map opens full-screen
- Touch interactions work on map markers

## Accessibility

- "Show on map" and "Close" buttons are keyboard focusable
- Visible focus styles on all interactive elements
- Map markers have proper ARIA labels
- All user-provided text is escaped to prevent XSS

## Error Handling

The geocoding service handles:
- **Network errors**: "Network error. Please check your connection and try again."
- **Timeouts**: "Geocoding request timed out. Please try again."
- **Rate limiting**: "Too many geocoding requests. Please wait a moment and try again."
- **Service unavailable**: "Geocoding service is temporarily unavailable. Please try again later."
- **Address not found**: "Address not found: [address]"

## Future Enhancements

To add a paid geocoder later:
1. Update `backend/src/services/geocoding.ts`
2. Replace the Nominatim implementation
3. Keep the same interface (`geocodeAddress(address)`)
4. No frontend changes needed
