import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { parseCoordinates } from '../utils/coordinates';

const branchIcon = icon({ iconUrl: markerIcon, iconRetinaUrl: markerIconRetina, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

function CenterMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => { map.setView([latitude, longitude], 15); }, [map, latitude, longitude]);
  return null;
}

interface MapProps {
  name: string;
  address: string;
  latitude: number | string | null;
  longitude: number | string | null;
  showExternalLink?: boolean;
}

const Map: React.FC<MapProps> = ({ name, address, latitude, longitude, showExternalLink = true }) => {
  const coordinates = parseCoordinates(latitude, longitude);
  const mapUrl = coordinates
    ? `https://www.openstreetmap.org/?mlat=${coordinates.latitude}&mlon=${coordinates.longitude}#map=15/${coordinates.latitude}/${coordinates.longitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${name}, ${address}`)}`;
  return (
    <section aria-label={`Map showing ${name}`}>
      {coordinates ? (
        <MapContainer center={[coordinates.latitude, coordinates.longitude]} zoom={15} scrollWheelZoom={false}
          className="branch-location-map" style={{ width: '100%', height: '320px', borderRadius: '0.5rem', zIndex: 0 }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <CenterMap {...coordinates} />
          <Marker position={[coordinates.latitude, coordinates.longitude]} icon={branchIcon} alt={`${name} location`} title={name}>
            <Popup><strong>{name}</strong><br />{address}</Popup>
          </Marker>
        </MapContainer>
      ) : <p>Map coordinates have not been added for this branch yet.{showExternalLink && ' You can search for its address below.'}</p>}
      {showExternalLink && <p style={{ marginBottom: 0 }}>
        <a href={mapUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
          Open {coordinates ? 'map' : 'address'} in OpenStreetMap
        </a>
      </p>}
    </section>
  );
};
export default Map;
