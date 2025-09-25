import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { RavenDetails } from '../types';
import { useTranslation } from '../i18n/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface NearestVehiclesModalProps {
  isOpen: boolean;
  onClose: () => void;
  ravens: RavenDetails[];
}

interface GeocodeResult {
    lat: string;
    lon: string;
}

interface RouteResult {
    distance: number; // meters
    duration: number; // seconds
}

interface ResultItem {
    raven: RavenDetails;
    distance: number; // haversine distance in km
    route?: RouteResult;
}

type VehicleStatus = 'driving' | 'parked' | 'offline';
const getRavenStatus = (raven: RavenDetails): VehicleStatus => {
    if (raven.unplugged || !raven.online) {
        return 'offline';
    }
    return raven.engineOn ? 'driving' : 'parked';
};

export const NearestVehiclesModal: React.FC<NearestVehiclesModalProps> = ({ isOpen, onClose, ravens }) => {
    const { t } = useTranslation();
    const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
    
    const [address, setAddress] = useState('');
    const [statusFilter, setStatusFilter] = useState<'driving' | 'driving_parked'>('driving_parked');
    const [calculateRoute, setCalculateRoute] = useState(false);
    const [results, setResults] = useState<ResultItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [calculationTimestamp, setCalculationTimestamp] = useState<Date | null>(null);
    const prevIsOpen = useRef(isOpen);

    // This effect handles resetting the state ONLY when the modal transitions from closed to open.
    // It prevents background data refreshes from clearing user input.
    useEffect(() => {
        if (!prevIsOpen.current && isOpen) {
            setAddress('');
            setResults(null);
            setError(null);
            setIsLoading(false);
            setCalculationTimestamp(null);
        }
        prevIsOpen.current = isOpen;
    }, [isOpen]);

    // This effect manages side effects like keyboard listeners and body scroll lock.
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    const haversineDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Radius of Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }, []);

    const findVehicles = async () => {
        if (!address.trim()) return;
        setIsLoading(true);
        setError(null);

        try {
            // 1. Geocode address
            const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`);
            if (!geoResponse.ok) throw new Error('Geocoding service failed');
            const geoData: GeocodeResult[] = await geoResponse.json();
            if (geoData.length === 0) {
                setError(t('nearestVehiclesModal.addressNotFound'));
                setResults([]);
                setCalculationTimestamp(null);
                setIsLoading(false);
                return;
            }
            const startPoint = { lat: parseFloat(geoData[0].lat), lon: parseFloat(geoData[0].lon) };

            // 2. Filter vehicles
            const filteredRavens = ravens.filter(raven => {
                const status = getRavenStatus(raven);
                const hasLocation = raven.last_known_location?.latitude && raven.last_known_location?.longitude;
                if (status === 'offline' || !hasLocation) return false;
                if (statusFilter === 'driving') return status === 'driving';
                return true; // driving_parked
            });

            if (filteredRavens.length === 0) {
                setResults([]);
                setCalculationTimestamp(new Date());
                setIsLoading(false);
                return;
            }

            // 3. Calculate Haversine distance and sort
            const sortedByDistance: ResultItem[] = filteredRavens.map(raven => {
                const { latitude, longitude } = raven.last_known_location!;
                return {
                    raven,
                    distance: haversineDistance(startPoint.lat, startPoint.lon, latitude, longitude)
                };
            }).sort((a, b) => a.distance - b.distance);

            const top10 = sortedByDistance.slice(0, 10);

            // 4. (Optional) Calculate driving ETA for top 3
            if (calculateRoute && top10.length > 0) {
                const top3 = top10.slice(0, 3);
                const routePromises = top3.map(async (item) => {
                    const { latitude, longitude } = item.raven.last_known_location!;
                    const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lon},${startPoint.lat};${longitude},${latitude}?overview=false`;
                    try {
                        const routeResponse = await fetch(url);
                        if (!routeResponse.ok) return item;
                        const routeData = await routeResponse.json();
                        if (routeData.code === 'Ok' && routeData.routes && routeData.routes.length > 0) {
                            return { ...item, route: { distance: routeData.routes[0].distance, duration: routeData.routes[0].duration } };
                        }
                    } catch (e) { console.error("OSRM error:", e); }
                    return item; // Return original item on failure
                });
                
                const top3WithRoutes = await Promise.all(routePromises);
                // Merge results back into top10
                top3WithRoutes.forEach((routedItem, index) => {
                    top10[index] = routedItem;
                });
            }

            setResults(top10);
            setCalculationTimestamp(new Date());

        } catch (err) {
            setError(err instanceof Error ? err.message : t('errors.unknown'));
            setResults([]);
            setCalculationTimestamp(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderResults = () => {
        if (results === null && !isLoading && !error) {
            return <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">{t('nearestVehiclesModal.enterAddressPrompt')}</p>;
        }

        return (
            <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h3 className="text-md font-semibold">{t('nearestVehiclesModal.resultsHeader')}</h3>
                        {calculationTimestamp && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t('nearestVehiclesModal.resultsTimestamp', { time: calculationTimestamp.toLocaleTimeString() })}
                            </p>
                        )}
                    </div>
                    {results !== null && (
                         <button onClick={findVehicles} disabled={isLoading} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait" title={t('common.refresh')}>
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                    )}
                </div>

                {isLoading && !results && (
                    <div className="text-center py-8">
                        <svg className="animate-spin mx-auto h-8 w-8 text-raven-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </div>
                )}
                
                {error && <p className="text-red-600 dark:text-red-400 mt-4">{error}</p>}
                
                {results && results.length === 0 && !error && (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">{t('nearestVehiclesModal.noResults')}</p>
                )}
                
                {results && results.length > 0 && (
                     <ol className="list-decimal list-inside space-y-2 text-sm max-h-64 overflow-y-auto pr-2">
                        {results.map(({ raven, distance, route }) => (
                            <li key={raven.uuid} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                <span className="font-medium">{raven.name}</span> - 
                                {route ? (
                                    <span className="text-raven-blue dark:text-sky-blue ml-1">
                                        {t('nearestVehiclesModal.drivingEta', {
                                            distance: (route.distance / 1000).toFixed(1),
                                            duration: Math.round(route.duration / 60)
                                        })}
                                    </span>
                                ) : (
                                    <span className="ml-1">{t('nearestVehiclesModal.kmAway', { distance: distance.toFixed(1) })}</span>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 transition-opacity duration-300 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="nearest-modal-title">
            <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 sm:p-8 relative w-full max-w-lg focus:outline-none" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h2 id="nearest-modal-title" className="text-2xl font-bold">{t('nearestVehiclesModal.title')}</h2>
                    <button onClick={onClose} className="p-1 -mt-2 -mr-2 text-gray-500 dark:text-gray-400 text-3xl hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none" aria-label={t('common.close')}>&times;</button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); findVehicles(); }} className="space-y-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder={t('nearestVehiclesModal.addressPlaceholder')}
                            className="block w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-raven-blue focus:border-raven-blue"
                            autoFocus
                        />
                        <button type="submit" disabled={isLoading} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-raven-blue hover:bg-raven-blue/90 disabled:bg-raven-blue/50">
                            {isLoading && !results ? t('nearestVehiclesModal.findingButton') : t('nearestVehiclesModal.findButton')}
                        </button>
                    </div>
                    <div>
                        <fieldset>
                            <legend className="text-sm font-medium mb-2">{t('nearestVehiclesModal.vehicleStatusLabel')}</legend>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm"><input type="radio" name="statusFilter" value="driving_parked" checked={statusFilter === 'driving_parked'} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-4 w-4 text-raven-blue focus:ring-raven-blue"/>{t('nearestVehiclesModal.drivingAndParked')}</label>
                                <label className="flex items-center gap-2 text-sm"><input type="radio" name="statusFilter" value="driving" checked={statusFilter === 'driving'} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-4 w-4 text-raven-blue focus:ring-raven-blue"/>{t('nearestVehiclesModal.drivingOnly')}</label>
                            </div>
                        </fieldset>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={calculateRoute} onChange={(e) => setCalculateRoute(e.target.checked)} className="h-4 w-4 rounded text-raven-blue focus:ring-raven-blue"/>
                            {t('nearestVehiclesModal.calculateRouteLabel')}
                        </label>
                    </div>
                </form>
                <div className="min-h-[100px] mt-4 pt-4 border-t border-soft-grey dark:border-gray-700">
                    {renderResults()}
                </div>
            </div>
        </div>
    );
};