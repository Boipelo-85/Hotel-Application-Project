import React from 'react';

interface MapProps {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

const Map: React.FC<MapProps> = ({ name, address, latitude, longitude }) => {
  const hasCoordinates = latitude != null && longitude != null;
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${name}, ${address}`)}`;
  const embedUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null;

  return (
    <section>
      {embedUrl ? (
        <iframe
          title={`Map showing ${name}`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ display: 'block', width: '100%', height: '320px', border: 0, borderRadius: '0.5rem' }}
        />
      ) : (
        <p>Map coordinates are not available. You can search for the address on the map.</p>
      )}
      <p style={{ marginBottom: 0 }}>
        <a href={mapUrl} target="_blank" rel="noreferrer">
          Open {hasCoordinates ? 'map' : 'address'} in OpenStreetMap
        </a>
      </p>
    </section>
  );
};

export default Map;
