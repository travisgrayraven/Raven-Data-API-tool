import React, { useState, useCallback } from 'react';
import type { ApiCredentials, RavenDetails, ApiLogEntry } from './types';
import { getToken, getRavens, getRavenDetails } from './services/ravenApi';
import { CredentialsForm } from './components/CredentialsForm';

const JsonViewer: React.FC<{ jsonString?: string }> = ({ jsonString }) => {
    if (!jsonString) {
        return <pre className="text-xs bg-gray-900 p-2 rounded-md overflow-x-auto text-gray-500"><code>(empty)</code></pre>;
    }
    try {
        const jsonObj = JSON.parse(jsonString);
        return <pre className="text-xs bg-gray-900 p-2 rounded-md overflow-x-auto"><code>{JSON.stringify(jsonObj, null, 2)}</code></pre>;
    } catch (e) {
        return <pre className="text-xs bg-gray-900 p-2 rounded-md overflow-x-auto"><code>{jsonString}</code></pre>;
    }
};

const ApiLogPanel: React.FC<{ logs: ApiLogEntry[] }> = ({ logs }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (logs.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <button
                className="w-full text-left text-xl font-semibold text-white p-4 bg-gray-900/50 flex justify-between items-center hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
                aria-controls="api-log-panel"
            >
                API Exchange Log
                <svg
                    className={`w-6 h-6 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            {isExpanded && (
                <div id="api-log-panel" className="p-4 space-y-4 max-h-96 overflow-y-auto" role="region">
                    {logs.map(log => (
                        <div key={log.id} className="bg-gray-700/50 rounded-lg p-4">
                            <div className="flex flex-wrap items-center gap-4 mb-2">
                                <span className="font-mono text-indigo-400 font-bold">{log.request.method}</span>
                                <span className="font-mono text-gray-300">{log.endpoint}</span>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${log.response.ok ? 'bg-green-300 text-green-900' : 'bg-red-300 text-red-900'}`}>
                                    {log.response.status} {log.response.statusText}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <h4 className="font-semibold text-gray-300 mb-1">Request Body</h4>
                                    <JsonViewer jsonString={log.request.body} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-300 mb-1">Response Body</h4>
                                    <JsonViewer jsonString={log.response.body} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
    const [ravens, setRavens] = useState<RavenDetails[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);

    const addApiLog = (log: ApiLogEntry) => {
        setApiLogs(prevLogs => [...prevLogs, log]);
    };

    const handleFetchData = useCallback(async (credentials: ApiCredentials) => {
        setIsLoading(true);
        setError(null);
        setRavens(null);
        setApiLogs([]);

        try {
            // Step 1: Get Token
            const token = await getToken(credentials, addApiLog);
            
            // Step 2: Get List of Ravens
            const ravenSummaries = await getRavens(credentials.apiUrl, token, addApiLog);
            if (ravenSummaries.length === 0) {
              setRavens([]);
              setIsLoading(false);
              return;
            }

            // Step 3: Get Details for each Raven
            const ravenDetailsPromises = ravenSummaries.map(raven => 
                getRavenDetails(credentials.apiUrl, token, raven.uuid, addApiLog)
            );
            
            const detailedRavens = await Promise.all(ravenDetailsPromises);
            
            setRavens(detailedRavens);

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleReset = () => {
      setRavens(null);
      setError(null);
      setIsLoading(false);
      setApiLogs([]);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">
                        Raven Data API Test App
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">
                        Vehicle Fleet Overview
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
                        <a 
                            href="https://github.com/travisgrayraven/Raven-Data-API-tool" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                            aria-label="View source code on GitHub"
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" 
                                height="16" 
                                fill="currentColor" 
                                className="bi bi-github" 
                                viewBox="0 0 16 16"
                                aria-hidden="true"
                            >
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                            </svg>
                            View Source Code
                        </a>
                        <a 
                            href="https://docs.klashwerks.com/developers/846b420d-2d51-4966-873a-00a58769e6b0/data-api/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                            aria-label="View Raven Data API documentation"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-box-arrow-up-right" viewBox="0 0 16 16" aria-hidden="true">
                                <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/>
                                <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/>
                            </svg>
                            Raven Data API
                        </a>
                    </div>
                </header>

                <main>
                    {error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {!ravens && (
                       <CredentialsForm onSubmit={handleFetchData} isLoading={isLoading} />
                    )}
                    
                    {isLoading && ravens === null && (
                         <div className="text-center">
                            <p className="text-lg text-gray-300">Fetching data...</p>
                         </div>
                    )}

                    {ravens && (
                      <div>
                        <div className="text-center mb-8">
                          <button
                            onClick={handleReset}
                            className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Reset & Enter New Credentials
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-8">
                            {ravens.length > 0 ? (
                                <div className="bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                                    <h2 className="text-xl font-semibold text-white mb-2">Data Fetched Successfully</h2>
                                    <p className="text-gray-400">{`Found details for ${ravens.length} vehicle(s).`}</p>
                                    <p className="text-gray-400 mt-2">You can inspect the data in the API Exchange Log below.</p>
                                </div>
                            ) : (
                                <div className="bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                                    <h2 className="text-xl font-semibold text-white mb-2">No Vehicles Found</h2>
                                    <p className="text-gray-400">The API returned an empty list of vehicles.</p>
                                </div>
                            )}
                            <ApiLogPanel logs={apiLogs} />
                        </div>
                      </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
