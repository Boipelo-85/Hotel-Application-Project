import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { Branch, SearchResult } from '../redux/hotelSlice';

interface SidebarMapCardProps {
  branches?: Branch[];
  searchResults?: SearchResult[];
  onShowFullMap: () => void;
  onMarkerHover?: (id: string | null) => void;
  hoveredCardId?: string | null;
}

const SidebarMapCard: React.FC<SidebarMapCardProps> = ({
  branches = [],
  searchResults = [],
  onShowFullMap,
  onMarkerHover,
  hoveredCardId,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<any>(null);
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  const isSearch = searchResults.length > 0;
  const properties = isSearch ? searchResults : branches;

  useEffect(() => {
    if (!mapRef.current || properties.length === 0) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [0, 0],
        zoom: 13,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    const markersGroup = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
      spiderfyOnMaxZoom: false,
      removeOutsideVisibleBounds: true,
      animate: false,
    });

    // Clear existing markers
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
    }
    markerRefs.current.clear();

    // Add markers
    const bounds: L.LatLngBoundsExpression = [];

    properties.forEach((property) => {
      const branch = isSearch ? (property as SearchResult).branch : (property as Branch);
      const lat = branch.latitude;
      const lng = branch.longitude;

      if (lat && lng) {
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="
              background-color: ${hoveredCardId === branch.id ? '#2563eb' : '#3b82f6'};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        });

        marker.on('mouseover', () => {
          if (onMarkerHover) onMarkerHover(branch.id);
        });

        marker.on('mouseout', () => {
          if (onMarkerHover) onMarkerHover(null);
        });

        markersGroup.addLayer(marker);
        markerRefs.current.set(branch.id, marker);
        bounds.push([lat, lng]);
      }
    });

    markersRef.current = markersGroup;
    map.addLayer(markersGroup);

    // Fit bounds if we have markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
    }

    return () => {
      if (markersRef.current) {
        map.removeLayer(markersRef.current);
      }
    };
  }, [properties, isSearch, hoveredCardId, onMarkerHover]);

  // Update marker colors when hoveredCardId changes
  useEffect(() => {
    markerRefs.current.forEach((marker, id) => {
      const icon = marker.getIcon() as L.DivIcon;
      const color = hoveredCardId === id ? '#2563eb' : '#3b82f6';
      icon.options.html = `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`;
      marker.setIcon(icon);
    });
  }, [hoveredCardId]);

  if (properties.length === 0) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    height: '200px',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    marginBottom: '1.5rem',
    border: '1px solid #e5e7eb',
  };

  const mapStyle: React.CSSProperties = {
    height: '100%',
    width: '100%',
  };

  const buttonStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '0.5rem 1.25rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '1.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
    transition: 'background-color 0.2s',
  };

  return (
    <div style={containerStyle}>
      <div ref={mapRef} style={mapStyle} />
      <button
        type="button"
        onClick={onShowFullMap}
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
      >
        Show on map
      </button>
    </div>
  );
};

export default SidebarMapCard;
