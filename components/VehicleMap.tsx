
import React, { useEffect, useRef } from 'react';
import type { RavenDetails } from '../types';
import L from 'leaflet';

// Fix for default marker icons when using Leaflet from a CDN.
// This manually sets the paths to the icon images.
(function() {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
})();


interface VehicleMapProps {
  ravens: RavenDetails[];
}

export const VehicleMap: React.FC<VehicleMapProps> = ({ ravens }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 4); // Default view
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapRef.current);
      markersRef.current = L.layerGroup().addTo(mapRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when ravens data changes
  useEffect(() => {
    if (mapRef.current && markersRef.current) {
      markersRef.current.clearLayers();

      const validRavens = ravens.filter(
        r => r.last_known_location?.latitude != null && r.last_known_location?.longitude != null
      );

      if (validRavens.length > 0) {
        const bounds = L.latLngBounds([]);
        validRavens.forEach(raven => {
          const { latitude, longitude } = raven.last_known_location!;
          const latLng = L.latLng(latitude, longitude);
          L.marker(latLng)
            .addTo(markersRef.current!)
            .bindPopup(`<b>${raven.name || 'Unnamed Vehicle'}</b><br>IMEI: ${raven.imei}`);
          bounds.extend(latLng);
        });
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [ravens]);


  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
       <h2 className="text-xl font-semibold text-white p-4 bg-gray-900/50">Raven Vehicle Locations</h2>
       <div ref={mapContainerRef} style={{ height: '500px', width: '100%' }} className="rounded-b-lg bg-gray-700" />
    </div>
  );
};
