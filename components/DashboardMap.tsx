

import React, { useEffect, useRef, useState } from 'react';
import type { RavenDetails } from '../types';
import { useTranslation } from '../i18n/i18n';

declare const L: any; // Declare Leaflet to TypeScript

interface DashboardMapProps {
    ravens: RavenDetails[];
    selectedRavenUuids: Set<string>;
    activeTab: 'map' | 'grid' | 'geofences';
}

export const DashboardMap: React.FC<DashboardMapProps> = ({ ravens, selectedRavenUuids, activeTab }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerClusterGroupRef = useRef<any>(null);
    const { t } = useTranslation();
    const [isResizing, setIsResizing] = useState(false);
    const prevTab = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!mapContainer.current) return;
        
        // Initialize map and cluster group only once
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
            
            markerClusterGroupRef.current = L.markerClusterGroup({
                disableClusteringAtZoom: 19,
                spiderfyOnMaxZoom: true,
            });
            mapRef.current.addLayer(markerClusterGroupRef.current);
        }
        
        const map = mapRef.current;
        const markerClusterGroup = markerClusterGroupRef.current;
        
        // Update markers from raven data
        markerClusterGroup.clearLayers();
        const validRavens = ravens.filter(r => r.last_known_location?.latitude && r.last_known_location?.longitude);
        if (validRavens.length > 0) {
            const markers = validRavens.map(raven => {
                const { latitude, longitude } = raven.last_known_location!;
                const isSelected = selectedRavenUuids.has(raven.uuid);

                const marker = L.marker([latitude, longitude], {
                    zIndexOffset: isSelected ? 1000 : 0,
                });
                
                // Apply a class for selection styling after the marker is added to the map
                marker.on('add', function() {
                    if (isSelected && this._icon) {
                        L.DomUtil.addClass(this._icon, 'selected-marker');
                    }
                });
                
                marker.bindPopup(`<b>${raven.name}</b>`);
                return marker;
            });
            markerClusterGroup.addLayers(markers);
        }

        // Handle resizing and fitting bounds only when the map is visible
        if (activeTab === 'map') {
            const justSwitchedToMap = prevTab.current !== 'map';
            if (justSwitchedToMap) {
                setIsResizing(true);
            }
            
            const timer = setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                    if (markerClusterGroup.getLayers().length > 0) {
                        map.fitBounds(markerClusterGroup.getBounds().pad(0.1));
                    }
                }
                if (justSwitchedToMap) {
                    setIsResizing(false);
                }
            }, 200);
            
            return () => clearTimeout(timer);
        }
        
    }, [ravens, selectedRavenUuids, t, activeTab]);

    useEffect(() => {
        prevTab.current = activeTab;
    }, [activeTab]);

    return (
        <div className="relative h-64 md:h-96 w-full rounded-lg shadow-md">
            {isResizing && (
                <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 z-10 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                        <svg className="animate-spin h-8 w-8 text-raven-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('dashboardMap.adjusting')}
                        </p>
                    </div>
                </div>
            )}
            <div ref={mapContainer} className="h-full w-full rounded-lg z-0" role="application" aria-label={t('dashboardMap.label')} />
        </div>
    );
};