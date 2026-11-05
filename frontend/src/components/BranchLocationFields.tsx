import React from 'react';
import Map from './Map';
import { parseCoordinates } from '../utils/coordinates';

interface Props {
  latitude: string; longitude: string;
  onLatitudeChange: (value: string) => void; onLongitudeChange: (value: string) => void;
  name: string; address: string;
}
const fieldStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '0.25rem' };

export default function BranchLocationFields({ latitude, longitude, onLatitudeChange, onLongitudeChange, name, address }: Props) {
  const coordinates = parseCoordinates(latitude, longitude);
  return (
    <fieldset style={{ minWidth: 0, margin: 0, padding: '1rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
      <legend>Map location</legend>
      <p id="branch-coordinate-help" style={{ marginTop: 0, fontSize: '0.85rem' }}>
        Enter the exact coordinates of your branch. Latitude comes first, followed by longitude. South African latitudes are negative.
      </p>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <label>Latitude<input required type="number" min={-90} max={90} step="any" value={latitude}
          onChange={event => onLatitudeChange(event.target.value)} placeholder="e.g. -25.7479" aria-describedby="branch-coordinate-help" style={fieldStyle} /></label>
        <label>Longitude<input required type="number" min={-180} max={180} step="any" value={longitude}
          onChange={event => onLongitudeChange(event.target.value)} placeholder="e.g. 28.2293" aria-describedby="branch-coordinate-help" style={fieldStyle} /></label>
        {coordinates && <><p style={{ margin: 0, fontSize: '0.85rem' }}>Check that the pin marks your branch before saving.</p>
          <Map name={name || 'Branch location'} address={address} {...coordinates} /></>}
      </div>
    </fieldset>
  );
}
