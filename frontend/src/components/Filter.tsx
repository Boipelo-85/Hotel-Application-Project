import React, { useState } from 'react';

export interface FilterOptions {
  minPrice?: number;
  maxPrice?: number;
  minStarRating?: number;
  amenities?: string[];
}

interface FilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  availableAmenities?: Array<{ id: string; name: string; category?: string }>;
}

const Filter: React.FC<FilterProps> = ({ onFilterChange, availableAmenities = [] }) => {
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minStarRating, setMinStarRating] = useState<string>('');
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());

  const handleAmenityToggle = (amenityId: string) => {
    const newSelected = new Set(selectedAmenities);
    if (newSelected.has(amenityId)) {
      newSelected.delete(amenityId);
    } else {
      newSelected.add(amenityId);
    }
    setSelectedAmenities(newSelected);
    applyFilters(newSelected, minPrice, maxPrice, minStarRating);
  };

  const applyFilters = (
    amenitiesSet: Set<string> = selectedAmenities,
    minPriceVal: string = minPrice,
    maxPriceVal: string = maxPrice,
    starRatingVal: string = minStarRating
  ) => {
    const filters: FilterOptions = {};
    if (minPriceVal) filters.minPrice = Number(minPriceVal);
    if (maxPriceVal) filters.maxPrice = Number(maxPriceVal);
    if (starRatingVal) filters.minStarRating = Number(starRatingVal);
    if (amenitiesSet.size > 0) filters.amenities = Array.from(amenitiesSet);
    onFilterChange(filters);
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    marginBottom: '1.5rem',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '1.25rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: '#111827',
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.25rem',
    width: '100%',
    marginBottom: '0.5rem',
  };

  const checkboxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    cursor: 'pointer',
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ marginBottom: '1rem', color: '#111827' }}>Filters</h3>

      <div style={sectionStyle}>
        <label style={labelStyle}>Price Range</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              applyFilters(selectedAmenities, e.target.value, maxPrice, minStarRating);
            }}
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              applyFilters(selectedAmenities, minPrice, e.target.value, minStarRating);
            }}
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Minimum Star Rating</label>
        <select
          value={minStarRating}
          onChange={(e) => {
            setMinStarRating(e.target.value);
            applyFilters(selectedAmenities, minPrice, maxPrice, e.target.value);
          }}
          style={inputStyle}
        >
          <option value="">Any</option>
          <option value="3">3+ Stars</option>
          <option value="4">4+ Stars</option>
          <option value="5">5 Stars</option>
        </select>
      </div>

      {availableAmenities.length > 0 && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Amenities</label>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {availableAmenities.map((amenity) => (
              <label key={amenity.id} style={checkboxStyle}>
                <input
                  type="checkbox"
                  checked={selectedAmenities.has(amenity.id)}
                  onChange={() => handleAmenityToggle(amenity.id)}
                />
                <span>
                  {amenity.name}
                  {amenity.category && ` (${amenity.category})`}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setMinPrice('');
          setMaxPrice('');
          setMinStarRating('');
          setSelectedAmenities(new Set());
          onFilterChange({});
        }}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
        }}
      >
        Clear Filters
      </button>
    </div>
  );
};

export default Filter;
