
import React, { useEffect, useRef } from 'react';
import type { RavenDetails } from '../types';
import { useTranslation } from '../i18n/i18n';

declare const L: any; // Declare Leaflet to TypeScript

interface DashboardMapProps {
    ravens: RavenDetails[];
}

export const DashboardMap: React.FC<DashboardMapProps> = ({ ravens }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (!mapContainer.current) return;
        
        // Initialize map only once
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainer.current).setView([45.4215, -75.6972], 5); // Default to Ottawa, ON

            const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });

            const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            });

            const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            });

            const baseMaps = {
                [t('dashboardMap.street')]: street,
                [t('dashboardMap.dark')]: dark,
                [t('dashboardMap.satellite')]: satellite
            };
            
            street.addTo(mapRef.current); // Add default layer
            L.control.layers(baseMaps).addTo(mapRef.current);
        }
        
        const map = mapRef.current;
        
        // Clear existing markers
        map.eachLayer((layer: any) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        const validRavens = ravens.filter(r => r.last_known_location?.latitude && r.last_known_location?.longitude);

        if (validRavens.length > 0) {
            const markers = L.featureGroup();
            
            validRavens.forEach(raven => {
                const { latitude, longitude } = raven.last_known_location!;
                const marker = L.marker([latitude, longitude]);
                marker.bindPopup(`<b>${raven.name}</b>`);
                markers.addLayer(marker);
            });

            markers.addTo(map);
            
            // Fit map to markers
            if (markers.getLayers().length > 0) {
                map.fitBounds(markers.getBounds().pad(0.1));
            }
        }

        // This addresses the sizing issue by ensuring Leaflet re-checks the container's
        // dimensions after the page has had a moment to fully render.
        const timer = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 100);
        
        return () => clearTimeout(timer);
        
    }, [ravens, t]);

    return <div ref={mapContainer} className="h-64 md:h-96 w-full rounded-lg shadow-md z-0" role="application" aria-label={t('dashboardMap.label')} />;
};