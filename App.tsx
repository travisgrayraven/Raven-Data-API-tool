
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { ApiCredentials, RavenDetails, ApiLogEntry, RavenSummary, Geofence, ApiContextType } from './types';
import { getToken, getRavens, getRavenDetails, getVehicleInfoFromVin, processWithConcurrency, getGeofences } from './services/ravenApi';
import { CredentialsForm } from './components/CredentialsForm';
import { Dashboard } from './components/Dashboard';
import { RavenDetailView } from './components/RavenDetailView';
import { HeaderActions } from './components/HeaderActions';
import { FullScreenImageViewer } from './components/FullScreenImageViewer';
import { useTheme } from './hooks/useTheme';

const CREDENTIALS_KEY = 'ravenApiCredentials';
const API_CONCURRENCY_LIMIT = 5; // A safe limit to avoid hitting rate limits

interface FullScreenViewerState {
  images: string[];
  currentIndex: number;
}

const App: React.FC = () => {
    const [credentials, setCredentials] = useState<ApiCredentials | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [ravens, setRavens] = useState<RavenDetails[] | null>(null);
    const [geofences, setGeofences] = useState<Geofence[] | null>(null);
    const [selectedRaven, setSelectedRaven] = useState<RavenDetails | null>(null);
    
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start true to check for stored creds
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);
    const [fullScreenViewerState, setFullScreenViewerState] = useState<FullScreenViewerState | null>(null);

    const [theme, setTheme] = useTheme();

    // Register service worker for PWA functionality
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(error => {
                        console.log('ServiceWorker registration failed: ', error);
                    });
            });
        }
    }, []);

    const addApiLog = useCallback((log: ApiLogEntry) => {
        setApiLogs(prevLogs => [log, ...prevLogs]);
    }, []);
    
    const clearState = () => {
        setCredentials(null);
        setToken(null);
        setRavens(null);
        setGeofences(null);
        setSelectedRaven(null);
        setError(null);
        setIsRefreshing(false);
        setApiLogs([]);
    }
    
    const handleReset = useCallback(() => {
      localStorage.removeItem(CREDENTIALS_KEY);
      clearState();
      setIsLoading(false);
    }, []);

    const handleFetchData = useCallback(async (creds: ApiCredentials, isRefresh = false) => {
        if (!isRefresh) {
            setIsLoading(true);
            clearState();
        } else {
            setIsRefreshing(true);
        }
        setError(null);

        try {
            const authToken = await getToken(creds, addApiLog);
            setCredentials(creds);
            setToken(authToken);
             localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
            
            const [ravenSummaries, fetchedGeofences] = await Promise.all([
                getRavens(creds.apiUrl, authToken, addApiLog),
                getGeofences(creds.apiUrl, authToken, addApiLog)
            ]);

            setGeofences(fetchedGeofences);

            if (ravenSummaries.length === 0) {
              setRavens([]);
              setIsLoading(false);
              setIsRefreshing(false);
              return;
            }

            const processRavenSummary = async (summary: RavenSummary): Promise<RavenDetails> => {
                const details = await getRavenDetails(creds.apiUrl, authToken, summary.uuid, addApiLog);
                const mergedRaven: RavenDetails = { ...summary, ...details };

                if (mergedRaven.vehicle_vin) {
                    const vehicleInfo = await getVehicleInfoFromVin(mergedRaven.vehicle_vin);
                    return { ...mergedRaven, vehicle_info: vehicleInfo };
                }
                return mergedRaven;
            };

            const processedRavens = await processWithConcurrency(
                ravenSummaries,
                processRavenSummary,
                API_CONCURRENCY_LIMIT
            );


            setRavens(processedRavens);

        } catch (err) {
            localStorage.removeItem(CREDENTIALS_KEY); // Clear bad credentials
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
            clearState();
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [addApiLog]);

    // Effect to load credentials from storage on initial load
    useEffect(() => {
        try {
            const storedCreds = localStorage.getItem(CREDENTIALS_KEY);
            if (storedCreds) {
                handleFetchData(JSON.parse(storedCreds));
            } else {
                setIsLoading(false); // No creds, stop loading and show form
            }
        } catch (e) {
            console.error("Failed to parse stored credentials", e);
            setIsLoading(false);
        }
    }, [handleFetchData]);

    const handleRefreshToken = useCallback(async (): Promise<string> => {
        const creds = credentials; // Capture current credentials
        if (!creds) {
            console.error("Attempted to refresh token without credentials.");
            handleReset();
            throw new Error("No credentials available for token refresh.");
        }
        try {
            console.log("Refreshing auth token...");
            const newToken = await getToken(creds, addApiLog);
            setToken(newToken);
            console.log("Auth token refreshed successfully.");
            return newToken;
        } catch (error) {
            console.error("Failed to refresh token:", error);
            handleReset(); // Force re-login if refresh fails
            throw error;
        }
    }, [credentials, addApiLog, handleReset]);

    const api = useMemo((): ApiContextType | null => {
        if (!credentials || !token) return null;
        return {
            apiUrl: credentials.apiUrl,
            token,
            addApiLog,
            refreshToken: handleRefreshToken,
        };
    }, [credentials, token, addApiLog, handleRefreshToken]);
    
    const handleRefreshData = () => {
        if (credentials) {
            handleFetchData(credentials, true);
        }
    }

    const handleSelectRaven = (raven: RavenDetails) => {
        window.scrollTo(0, 0);
        setSelectedRaven(raven);
    };
    
    const handleBackToDashboard = () => {
        window.scrollTo(0, 0);
        setSelectedRaven(null);
    };

    const handleOpenImageViewer = (images: string[], currentIndex: number) => {
        setFullScreenViewerState({ images, currentIndex });
    };

    const handleCloseImageViewer = () => {
        setFullScreenViewerState(null);
    };

    const handleNavigateImageViewer = (direction: 'next' | 'prev') => {
        setFullScreenViewerState(prevState => {
            if (!prevState) return null;
            const { images, currentIndex } = prevState;
            let newIndex = currentIndex;
            if (direction === 'next') {
                newIndex = Math.min(currentIndex + 1, images.length - 1);
            } else {
                newIndex = Math.max(currentIndex - 1, 0);
            }
            return { ...prevState, currentIndex: newIndex };
        });
    };

    const renderContent = () => {
        if (isLoading && !ravens) {
            return (
                <div className="text-center">
                    <p className="text-lg">Authenticating & Fetching data...</p>
                </div>
            );
        }

        if (ravens && api && geofences) {
            if (selectedRaven) {
                return <RavenDetailView raven={selectedRaven} api={api} onBack={handleBackToDashboard} logs={apiLogs} onImageClick={handleOpenImageViewer} />;
            }
            return <Dashboard 
                ravens={ravens} 
                geofences={geofences} 
                onSetGeofences={setGeofences}
                onSelectRaven={handleSelectRaven} 
                onRefreshData={handleRefreshData} 
                isRefreshing={isRefreshing} 
                api={api}
            />;
        }
        
        return <CredentialsForm onSubmit={handleFetchData} isLoading={isLoading} />;
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 pb-4 border-b border-soft-grey dark:border-gray-700">
                    <div className="flex justify-between items-center">
                         <div className="flex items-center gap-4">
                            {/* White logo for dark mode */}
                            <img src="https://i.ibb.co/B2hyVFKy/Raven-Logo-White-on-Transparent-3.png" alt="Raven Logo" className="h-10 w-auto hidden dark:block" />
                            {/* Black logo for light mode */}
                            <img src="https://i.ibb.co/RpWcXBcc/Raven-Logo-Black-on-Transparent-Banner-7.png" alt="Raven Logo" className="h-10 w-auto dark:hidden" />
                         </div>
                         <div>
                             <HeaderActions 
                                theme={theme} 
                                setTheme={setTheme} 
                                onReset={handleReset}
                             />
                         </div>
                    </div>
                </header>

                <main>
                    {error && (
                        <div className="bg-alert-red/10 dark:bg-alert-red/20 border border-alert-red/50 dark:border-alert-red/70 text-alert-red dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    {renderContent()}
                </main>
                <footer className="mt-8 py-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-soft-grey dark:border-gray-700">
                    <p>
                        © <a href="https://ravenconnected.com/" target="_blank" rel="noopener noreferrer" className="hover:underline text-raven-blue dark:text-raven-blue">Raven Connected Inc.</a> 2025
                    </p>
                </footer>
            </div>
            <FullScreenImageViewer
                isOpen={!!fullScreenViewerState}
                images={fullScreenViewerState?.images || []}
                currentIndex={fullScreenViewerState?.currentIndex || 0}
                onClose={handleCloseImageViewer}
                onNavigate={handleNavigateImageViewer}
            />
        </div>
    );
};

export default App;