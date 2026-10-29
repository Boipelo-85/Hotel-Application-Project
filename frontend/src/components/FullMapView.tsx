import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { Branch, SearchResult } from '../redux/hotelSlice';

// Simple HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

interface FullMapViewProps {
  isOpen: boolean;
  onClose: () => void;
  branches?: Branch[];
  searchResults?: SearchResult[];
  onPropertyClick?: (id: string) => void;
  hoveredCardId?: string | null;
}

const FullMapView: React.FC<FullMapViewProps> = ({
  isOpen,
  onClose,
  branches = [],
  searchResults = [],
  onPropertyClick,
  hoveredCardId,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<any>(null);
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const isSearch = searchResults.length > 0;
  const properties = isSearch ? searchResults : branches;

  useEffect(() => {
    if (!isOpen || !mapRef.current || properties.length === 0) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [0, 0],
        zoom: 13,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    map.invalidateSize();

    const markersGroup = (L as any).markerClusterGroup({
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
      animate: true,
    });

    // Clear existing markers
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
    }
    markerRefs.current.clear();

    // Add markers
    const bounds: L.LatLngBoundsExpression = [];
    let validProperties = 0;

    properties.forEach((property) => {
      const branch = isSearch ? (property as SearchResult).branch : (property as Branch);
      const lat = branch.latitude;
      const lng = branch.longitude;
      const price = isSearch ? (property as SearchResult).price : (property as Branch).price_per_night;
      const currency = isSearch ? (property as SearchResult).currency : (property as Branch).currency;
      const rating = isSearch ? (branch as any).starRating : (property as Branch).star_rating;

      if (lat && lng) {
        validProperties++;
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              background-color: ${hoveredCardId === branch.id ? '#2563eb' : '#3b82f6'};
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              transition: background-color 0.2s;
            "></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        });

        // Escape HTML to prevent XSS
        const escapedName = escapeHtml(branch.name);
        const escapedPrice = escapeHtml(`${currency} ${price}`);
        const escapedRating = rating ? escapeHtml(`${rating} ★`) : '';

        const popupContent = `
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px;">${escapedName}</h3>
            <p style="margin: 4px 0; font-size: 14px; font-weight: bold;">${escapedPrice}</p>
            ${escapedRating ? `<p style="margin: 4px 0; font-size: 14px; color: #f59e0b;">${escapedRating}</p>` : ''}
            <button
              style="
                margin-top: 8px;
                padding: 6px 12px;
                background-color: #3b82f6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
              "
              onclick="window.dispatchEvent(new CustomEvent('propertyClick', { detail: '${branch.id}' }))"
            >
              View Details
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onPropertyClick) {
            onPropertyClick(branch.id);
          }
        });

        markersGroup.addLayer(marker);
        markerRefs.current.set(branch.id, marker);
        bounds.push([lat, lng]);
      }
    });

    if (validProperties === 0) {
      setError('No properties with valid coordinates found');
      return;
    } else {
      setError(null);
    }

    markersRef.current = markersGroup;
    map.addLayer(markersGroup);

    // Fit bounds if we have markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    // Handle custom event for popup button clicks
    const handlePropertyClick = (event: CustomEvent) => {
      if (onPropertyClick) {
        onPropertyClick(event.detail);
      }
    };

    window.addEventListener('propertyClick', handlePropertyClick as EventListener);

    return () => {
      window.removeEventListener('propertyClick', handlePropertyClick as EventListener);
      if (markersRef.current) {
        map.removeLayer(markersRef.current);
      }
    };
  }, [isOpen, properties, isSearch, hoveredCardId, onPropertyClick]);

  // Update marker colors when hoveredCardId changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markerRefs.current.forEach((marker, id) => {
      const icon = marker.getIcon() as L.DivIcon;
      const color = hoveredCardId === id ? '#2563eb' : '#3b82f6';
      icon.options.html = `<div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: background-color 0.2s;
      "></div>`;
      marker.setIcon(icon);
    });
  }, [hoveredCardId]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const modalStyle: React.CSSProperties = {
    position: 'relative',
    width: '90vw',
    height: '90vh',
    maxWidth: '1400px',
    maxHeight: '900px',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: 'white',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111827',
  };

  const closeButtonStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  };

  const mapContainerStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
  };

  const mapStyle: React.CSSProperties = {
    height: '100%',
    width: '100%',
  };

  const errorStyle: React.CSSProperties = {
    padding: '2rem',
    textAlign: 'center',
    color: '#991b1b',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Map View</h2>
          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
          >
            Close
          </button>
        </div>
        <div style={mapContainerStyle}>
          {error ? (
            <div style={errorStyle}>{error}</div>
          ) : (
            <div ref={mapRef} style={mapStyle} />
          )}
        </div>
      </div>
    </div>
  );
};

export default FullMapView;
