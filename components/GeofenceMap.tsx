


import React, { useEffect, useRef } from 'react';
import type { Geofence } from '../types';

declare const L: any; // Declare Leaflet to TypeScript

interface GeofenceMapProps {
    geofences: Geofence[];
    onSelectGeofence: (geofence: Geofence) => void;
}

const getGeofenceStatus = (geofence: Geofence) => {
    if (geofence.end === null) {
        return { text: 'Active', color: 'green', description: 'This geofence is active and does not expire.' };
    }
    const endDate = new Date(geofence.end);
    const now = new Date();
    if (endDate < now) {
        return { text: 'Expired', color: 'gray', description: `Expired on ${endDate.toLocaleDateString()}` };
    }
    return { text: 'Active', color: 'green', description: `Expires on ${endDate.toLocaleDateString()}` };
};

const formatNotificationLabel = (notification: string) => {
    switch(notification) {
        case 'ENTER': return 'On Enter';
        case 'EXIT': return 'On Exit';
        case 'ENTER,EXIT': return 'On Enter & Exit';
        default: return 'None';
    }
};

export const GeofenceMap: React.FC<GeofenceMapProps> = ({ geofences, onSelectGeofence }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

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
                "Street": street,
                "Dark": dark,
                "Satellite": satellite
            };
            
            street.addTo(mapRef.current); // Add default layer
            L.control.layers(baseMaps).addTo(mapRef.current);
        }
        
        const map = mapRef.current;
        
        // Clear existing geofence layers
        map.eachLayer((layer: any) => {
            if (layer.feature) { // Check if it's a GeoJSON layer
                map.removeLayer(layer);
            }
        });

        const allLayersGroup = L.featureGroup();

        if (geofences.length > 0) {
            geofences.forEach(geofence => {
                let shape;
                const status = getGeofenceStatus(geofence);
                const isActive = status.color === 'green';

                const style = { 
                    color: isActive ? '#3388ff' : '#888888',
                    weight: isActive ? 3 : 2,
                    opacity: isActive ? 0.8 : 0.6,
                    fillOpacity: isActive ? 0.2 : 0.1
                };

                if (geofence.shape_type === 'POLYGON' && geofence.shape_data.coordinates && geofence.shape_data.coordinates.length > 0) {
                    const leafletCoords = geofence.shape_data.coordinates;
                    shape = L.polygon(leafletCoords, style);
                } else if (geofence.shape_type === 'CIRCLE' && geofence.shape_data.center && typeof geofence.shape_data.radius === 'number') {
                    const center = geofence.shape_data.center;
                    const radius = geofence.shape_data.radius;
                    shape = L.circle(center, { ...style, radius });
                }

                if (shape) {
                    shape.feature = { properties: { uuid: geofence.uuid } }; // Tag layer
                    shape.on('click', () => onSelectGeofence(geofence));
                    allLayersGroup.addLayer(shape);
                }
            });

            allLayersGroup.addTo(map);
        }

        const timer = setTimeout(() => {
            if (!mapRef.current) return;
            map.invalidateSize();
            if (allLayersGroup.getLayers().length > 0) {
                map.fitBounds(allLayersGroup.getBounds().pad(0.1));
            }
        }, 100);
        return () => clearTimeout(timer);
        
    }, [geofences, onSelectGeofence]);

    if (geofences.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">No Geofences Found</h2>
                <p className="text-gray-600 dark:text-gray-400">There are no geofences associated with this account. Use the buttons above to create one or upload a CSV file.</p>
            </div>
        );
    }

    return (
        <div>
            <div ref={mapContainer} className="h-[60vh] w-full rounded-lg shadow-md z-0" />

            <div className="mt-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                    <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                        {geofences.map(geofence => {
                            const status = getGeofenceStatus(geofence);
                            return (
                                <li 
                                    key={geofence.uuid} 
                                    onClick={() => onSelectGeofence(geofence)}
                                    className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors duration-200"
                                    role="button"
                                    tabIndex={0}
                                    onKeyPress={(e) => e.key === 'Enter' && onSelectGeofence(geofence)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-md font-semibold text-indigo-600 dark:text-indigo-400 truncate">{geofence.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{geofence.description || '(No description)'}</p>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-4">
                                                <span>Created: {new Date(geofence.start).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                                    {status.description}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex flex-col items-end gap-2 text-sm">
                                            <p className="text-gray-600 dark:text-gray-300 font-mono capitalize text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                                                {geofence.shape_type ? geofence.shape_type.toLowerCase() : 'N/A'}
                                            </p>
                                            {status.color === 'green' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                                                    {status.text}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                    {status.text}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                                {formatNotificationLabel(geofence.notification)}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
};