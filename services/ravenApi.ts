
import type { ApiCredentials, RavenSummary, RavenDetails, ApiLogEntry, RavenEvent, RavenSettings, VehicleInfo, ApiContextType, Geofence, GeofenceFormData } from '../types';

// Add a declaration for the Leaflet global 'L' to resolve 'Cannot find name 'L'' error.
declare const L: any;

interface TokenResponse {
  token: string;
}

let logIdCounter = 0;

const PROXY_URL = 'https://ravenview-proxy-461394928777.northamerica-northeast2.run.app';

const logApiCall = (
  onLog: (log: ApiLogEntry) => void,
  endpoint: string,
  requestOptions: RequestInit,
  response: Response,
  responseBodyText: string
) => {
  let loggedRequestBody = requestOptions.body as string | undefined;
  let loggedResponseBody = responseBodyText;

  // Mask sensitive information for the authentication endpoint
  if (endpoint === '/auth/token') {
    // Mask the secret in the request body
    if (loggedRequestBody) {
        try {
            const body = JSON.parse(loggedRequestBody);
            if (body?.api_key?.secret) {
                body.api_key.secret = '********';
            }
            loggedRequestBody = JSON.stringify(body, null, 2);
        } catch (e) {
            // Ignore parsing errors, log the original body
        }
    }
    // Mask the token in the response body
    if (loggedResponseBody) {
        try {
            const body = JSON.parse(loggedResponseBody);
            if (body?.token) {
                body.token = '********';
            }
            loggedResponseBody = JSON.stringify(body, null, 2);
        } catch (e) {
            // Ignore parsing errors, log the original body
        }
    }
  }


  onLog({
    id: logIdCounter++,
    timestamp: new Date().toISOString(),
    endpoint,
    request: {
      method: requestOptions.method || 'GET',
      headers: requestOptions.headers as Record<string, string>,
      body: loggedRequestBody,
    },
    response: {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: loggedResponseBody,
    },
  });
};

/**
 * A centralized fetch function that handles authentication and automatic token refreshing.
 * If an API call returns a 401 Unauthorized error, it attempts to refresh the token
 * and retries the request once.
 */
const authedFetch = async (url: string, options: RequestInit, api: ApiContextType): Promise<Response> => {
    const makeRequest = async (token: string): Promise<Response> => {
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return fetch(url, { ...options, headers });
    };

    let response = await makeRequest(api.token);

    if (response.status === 401) {
        console.warn('API call unauthorized (401). Attempting to refresh token.');
        try {
            const newToken = await api.refreshToken();
            // Retry the request with the new token.
            response = await makeRequest(newToken);
        } catch (refreshError) {
            console.error('Token refresh failed. The original 401 response will be returned.', refreshError);
            // If refresh fails, we return the original 401 response.
            // The App component's refreshToken handler will have already cleared the session.
        }
    }

    return response;
};


export const getToken = async (credentials: ApiCredentials, onLog: (log: ApiLogEntry) => void): Promise<string> => {
  const url = `${credentials.apiUrl}/auth/token`;
  const requestBody = {
    api_key: {
      key: credentials.apiKey,
      secret: credentials.apiSecret,
    },
  };
   const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  };

  const response = await fetch(url, requestOptions);
  const responseBodyText = await response.text();

  logApiCall(onLog, '/auth/token', requestOptions, response, responseBodyText);

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.status} ${responseBodyText}`);
  }

  const data: TokenResponse = JSON.parse(responseBodyText);
  return data.token;
};

export const getRavens = async (apiUrl: string, token: string, onLog: (log: ApiLogEntry) => void): Promise<RavenSummary[]> => {
  const url = `${apiUrl}/ravens`;
  const requestOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  };

  const response = await fetch(url, requestOptions);
  const responseBodyText = await response.text();

  logApiCall(onLog, '/ravens', requestOptions, response, responseBodyText);

  if (!response.ok) {
    throw new Error(`Failed to get ravens list: ${response.status} ${responseBodyText}`);
  }

  const data = JSON.parse(responseBodyText);
  // Transform the API response to our internal RavenSummary type
  return (data.results || []).map((raven: any) => ({
    uuid: raven.uuid,
    name: raven.car_persona || 'Unnamed Vehicle',
    serial_number: raven.enclosure_serial_no,
    vehicle_vin: raven.vin,
    imei: raven.imei, // Assuming these fields exist or are undefined
    iccid: raven.iccid,
    thing_name: raven.thing_name,
    vehicle_id: raven.vehicle_id,
  }));
};

export const getRavenDetails = async (apiUrl: string, token: string, uuid: string, onLog: (log: ApiLogEntry) => void): Promise<Partial<RavenDetails>> => {
    const url = `${apiUrl}/ravens/${uuid}`;
    const requestOptions: RequestInit = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        },
    };

    const response = await fetch(url, requestOptions);
    const responseBodyText = await response.text();
    
    logApiCall(onLog, `/ravens/${uuid}`, requestOptions, response, responseBodyText);

    if (!response.ok) {
        throw new Error(`Failed to get details for raven ${uuid}: ${response.status} ${responseBodyText}`);
    }
    
    const data = await JSON.parse(responseBodyText);

    // Transform the raw API data into our clean RavenDetails structure
    const details: Partial<RavenDetails> = {
        uuid: data.ravenUuid,
        serial_number: data.serialNo,
        online: data.online,
        engineOn: data.engineOn,
        unplugged: data.unplugged,
        vehicle_vin: data.vehicle?.vin,
    };
    
    // Safely parse location data, ensuring timestamp is a valid number
    if (data.lastLocation && typeof data.lastLocation.timestamp === 'number') {
        details.last_known_location = {
            latitude: data.lastLocation.latitude,
            longitude: data.lastLocation.longitude,
            timestamp: new Date(data.lastLocation.timestamp * 1000).toISOString(),
        };
    }

    // Safely parse OBD data
    if (data.vehicle) {
        // Fix: Use a Partial type to build the obd object, as timestamp is required but added later.
        const obd: Partial<NonNullable<RavenDetails['last_known_obd_snapshot']>> = {};
        let obdDataFound = false;
        let mostRecentTimestamp = 0; // Keep track of the latest valid timestamp

        if (data.vehicle.odometer?.supported && typeof data.vehicle.odometer.value === 'number') {
            obd.odometer_km = data.vehicle.odometer.value;
            if (typeof data.vehicle.odometer.timestamp === 'number') {
                mostRecentTimestamp = Math.max(mostRecentTimestamp, data.vehicle.odometer.timestamp);
            }
            obdDataFound = true;
        }

        if (data.vehicle.fuelLevel?.supported && typeof data.vehicle.fuelLevel.value === 'number') {
            obd.fuel_level_percentage = data.vehicle.fuelLevel.value;
            if (typeof data.vehicle.fuelLevel.timestamp === 'number') {
                mostRecentTimestamp = Math.max(mostRecentTimestamp, data.vehicle.fuelLevel.timestamp);
            }
            obdDataFound = true;
        }

        if (obdDataFound) {
            // Only add a timestamp to the snapshot if a valid one was found in the source data
            if (mostRecentTimestamp > 0) {
                obd.timestamp = new Date(mostRecentTimestamp * 1000).toISOString();
                // Fix: Only assign the snapshot if it's complete and has a timestamp, satisfying the type.
                details.last_known_obd_snapshot = obd as NonNullable<RavenDetails['last_known_obd_snapshot']>;
            }
        }
    }

    return details;
};

interface NhtsaVariable {
    Value: string | null;
    Variable: string;
}

interface NhtsaVinDecodeResponse {
    Results: NhtsaVariable[];
}

export const getVehicleInfoFromVin = async (vin: string): Promise<VehicleInfo | null> => {
    if (!vin || vin === 'UNINITIALIZED') return null;
    
    // A standard VIN is 17 characters. Some systems might return padded or longer strings.
    // We'll take the first 17 characters for the API call.
    const vin17 = vin.substring(0, 17);

    try {
        const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin17}?format=json`);
        if (!response.ok) {
            console.error(`NHTSA API error for VIN ${vin17}: ${response.statusText}`);
            return null;
        }
        const data: NhtsaVinDecodeResponse = await response.json();
        const results = data.Results;
        
        if (!results || results.length === 0) return null;
        
        const getValue = (variable: string) => results.find(r => r.Variable === variable)?.Value || null;

        const make = getValue('Make');
        const model = getValue('Model');
        const year = getValue('Model Year');

        if (!make || !model || !year) {
             return null;
        }

        return { make, model, year };
    } catch (error) {
        // Log with both original and truncated VIN for debugging.
        console.error(`Failed to fetch vehicle info for VIN ${vin} (used ${vin17}):`, error);
        return null;
    }
};

export const getRavenEvents = async (api: ApiContextType, uuid: string, startDate?: Date, endDate?: Date): Promise<RavenEvent[]> => {
    const params = new URLSearchParams();

    if (startDate) {
        params.append('start_timestamp', String(Math.floor(startDate.getTime() / 1000)));
    }
    if (endDate) {
        // Set to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.append('end_timestamp', String(Math.floor(endOfDay.getTime() / 1000)));
    }
    
    const url = `${api.apiUrl}/ravens/${uuid}/events${params.toString() ? `?${params.toString()}` : ''}`;
    const requestOptions: RequestInit = {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
    };

    const response = await authedFetch(url, requestOptions, api);
    const responseBodyText = await response.text();
    
    logApiCall(api.addApiLog, `/ravens/${uuid}/events?${params.toString()}`, requestOptions, response, responseBodyText);

    if (!response.ok) {
        throw new Error(`Failed to get events for raven ${uuid}: ${response.status} ${responseBodyText}`);
    }
    
    const data = await JSON.parse(responseBodyText);
    
    return (data.results || []).map((rawEvent: any): RavenEvent => {
        const roadMediaIds = rawEvent.media
            ?.filter((m: any) => m.camera === 'ROAD' && m.mediaId)
            .map((m: any) => m.mediaId);

        const cabinMediaIds = rawEvent.media
            ?.filter((m: any) => m.camera === 'CABIN' && m.mediaId)
            .map((m: any) => m.mediaId);

        const event: RavenEvent = {
            ...rawEvent,
            event_type: rawEvent.type,
            event_timestamp: new Date(rawEvent.timestamp * 1000).toISOString(),
            road_media_ids: roadMediaIds?.length > 0 ? roadMediaIds : undefined,
            cabin_media_ids: cabinMediaIds?.length > 0 ? cabinMediaIds : undefined,
        };
        
        // Extract lat/lon from the coordinates array if it exists
        if (Array.isArray(rawEvent.coordinates) && rawEvent.coordinates.length === 2) {
            event.longitude = rawEvent.coordinates[0];
            event.latitude = rawEvent.coordinates[1];
        }

        return event;
    });
};

export const getRavenSettings = async (api: ApiContextType, uuid: string): Promise<RavenSettings> => {
    const url = `${api.apiUrl}/ravens/${uuid}/settings`;
    const requestOptions: RequestInit = {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
    };

    const response = await authedFetch(url, requestOptions, api);
    const responseBodyText = await response.text();
    
    logApiCall(api.addApiLog, `/ravens/${uuid}/settings`, requestOptions, response, responseBodyText);

    if (!response.ok) {
        throw new Error(`Failed to get settings for raven ${uuid}: ${response.status} ${responseBodyText}`);
    }
    
    const data = await JSON.parse(responseBodyText);
    return data;
};

export const updateRavenSettings = async (api: ApiContextType, uuid: string, settings: RavenSettings): Promise<RavenSettings> => {
    const url = `${api.apiUrl}/ravens/${uuid}/settings`;
    const requestOptions: RequestInit = {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(settings),
    };

    const response = await authedFetch(url, requestOptions, api);
    const responseBodyText = await response.text();
    
    logApiCall(api.addApiLog, `/ravens/${uuid}/settings`, requestOptions, response, responseBodyText);

    if (!response.ok) {
        throw new Error(`Failed to update settings for raven ${uuid}: ${response.status} ${responseBodyText}`);
    }
    
    if (!responseBodyText) {
        return settings;
    }
    
    const data = JSON.parse(responseBodyText);
    return data;
};

export const setDriverMessage = async (api: ApiContextType, uuid: string, message: string, durationInSeconds: number): Promise<void> => {
    const url = `${api.apiUrl}/ravens/${uuid}/driver-message`;
    const requestBody = { message, duration: durationInSeconds };
    const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
    };

    const response = await authedFetch(url, requestOptions, api);
    const responseBodyText = await response.text();
    
    logApiCall(api.addApiLog, `/ravens/${uuid}/driver-message`, requestOptions, response, responseBodyText);

    if (!response.ok) {
        throw new Error(`Failed to set driver message for raven ${uuid}: ${response.status} ${responseBodyText}`);
    }
};

export const clearDriverMessage = async (api: ApiContextType, uuid: string): Promise<void> => {
    const url = `${api.apiUrl}/ravens/${uuid}/driver-message`;
    const requestOptions: RequestInit = {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
    };

    const response = await authedFetch(url, requestOptions, api);
    const responseBodyText = await response.text();
    
    logApiCall(api.addApiLog, `/ravens/${uuid}/driver-message`, requestOptions, response, responseBodyText);

    if (!response.ok) {
        throw new Error(`Failed to clear driver message for raven ${uuid}: ${response.status} ${responseBodyText}`);
    }
};

export const getMediaUrlViaProxy = async (api: ApiContextType, raven_uuid: string, media_id: string): Promise<string> => {
    const response = await fetch(`${PROXY_URL}/proxy/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            apiUrl: api.apiUrl,
            ravenUuid: raven_uuid,
            mediaId: media_id,
            token: api.token
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Media fetch failed: ${errorText || response.statusText} (${response.status})`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

// --- GEOFENCE API FUNCTIONS ---

// Helper function to transform raw geofence data
const transformRawGeofence = (raw: any): Geofence | null => {
    try {
        // Fix: Robustly handle geojson which might be a string (from list view) or an object (from create/update view).
        const geojson = typeof raw.geojson === 'string' 
            ? JSON.parse(raw.geojson || '{}') 
            : raw.geojson || {};
            
        const geometry = geojson.geometry;
        const properties = geojson.properties;

        let shape_type: 'POLYGON' | 'CIRCLE' | undefined;
        const shape_data: Geofence['shape_data'] = {};

        if (geometry?.type === 'Point' && Array.isArray(geometry.coordinates) && geometry.coordinates.length === 2) {
            shape_type = 'CIRCLE';
            shape_data.center = [geometry.coordinates[1], geometry.coordinates[0]]; 
            shape_data.radius = properties?.radius;
        } else if (geometry?.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
            shape_type = 'POLYGON';
            shape_data.coordinates = geometry.coordinates.map((ring: [number, number][]) => 
                ring.map((point: [number, number]) => [point[1], point[0]])
            );
        }

        if (!shape_type) {
            console.warn('Could not determine shape type for geofence:', raw);
            return null;
        }

        return {
            uuid: raw.geofence_id || raw.uuid,
            name: raw.name,
            description: raw.description,
            start: raw.start,
            end: raw.end,
            notification: raw.notification || '',
            shape_type: shape_type,
            shape_data,
        };
    } catch (error) {
        console.error('Failed to parse geofence data:', raw, error);
        return null;
    }
};


export const getGeofences = async (apiUrl: string, token: string, onLog: (log: ApiLogEntry) => void): Promise<Geofence[]> => {
  const url = `${apiUrl}/geofences`;
  const requestOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  };

  const response = await fetch(url, requestOptions);
  const responseBodyText = await response.text();

  logApiCall(onLog, '/geofences', requestOptions, response, responseBodyText);

  if (!response.ok) {
    throw new Error(`Failed to get geofences: ${response.status} ${responseBodyText}`);
  }

  const data = JSON.parse(responseBodyText);
  const rawGeofences = data.results || [];
  
  return rawGeofences
    .map(transformRawGeofence)
    .filter((g): g is Geofence => g !== null);
};

// Helper to convert a leaflet-draw layer into the API's required GeoJSON string format.
// This also handles transforming coordinates from Leaflet's [lat, lon] to GeoJSON's [lon, lat].
const layerToApiGeoJsonString = (layer: any, address: string): string => {
    const geojson = layer.toGeoJSON();
    
    // The properties object in the GeoJSON string needs an 'address' field.
    const properties: { address: string; radius?: number } = { address };

    // For circles, leaflet-draw creates a Point GeoJSON. We need to manually add the radius
    // to the properties object, as this is how the Raven API expects circle data.
    if (layer instanceof L.Circle) {
        properties.radius = layer.getRadius();
    }

    return JSON.stringify({
        geometry: geojson.geometry,
        properties: properties,
    });
};

const getEndDateISO = (dateString: string): string | null => {
    if (!dateString) return null; // Empty string from date input means no expiration
    // The date input gives YYYY-MM-DD. `new Date()` will parse this in the user's local timezone.
    // To avoid timezone issues, we create the date in UTC and set it to the very end of that day.
    const date = new Date(`${dateString}T00:00:00.000Z`);
    date.setUTCHours(23, 59, 59, 999);
    return date.toISOString();
};


export const createGeofence = async (api: ApiContextType, data: GeofenceFormData & { layer: any }): Promise<Geofence> => {
    const url = `${api.apiUrl}/geofences`;
    
    const styleObject = {
        "fill-color": "#3388ff",
        "stroke-color": "#3388ff",
        "fill-opacity": 0.2,
        "stroke-opacity": 0.8,
        "weight": 3,
    };

    const payload = {
        name: data.name,
        description: data.description,
        geojson: layerToApiGeoJsonString(data.layer, data.description),
        start: new Date().toISOString(),
        end: getEndDateISO(data.end),
        notification: data.notification,
        style: JSON.stringify(styleObject),
    };
    
    const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
    };

    // 1. Make the POST request to create the geofence.
    const response = await authedFetch(url, requestOptions, api);
    const responseBodyText = await response.text();
    
    logApiCall(api.addApiLog, `/geofences`, requestOptions, response, responseBodyText);

    // 2. Check for a successful response (2xx).
    if (!response.ok) {
        throw new Error(`Failed to create geofence: ${response.status} ${responseBodyText}`);
    }
    
    let locationUrl: string | null = null;

    // 3. Determine the URL of the new resource. The API might return a 201 with a Location header,
    // or a 200 with the new ID in the body.
    if (response.status === 201) {
        locationUrl = response.headers.get('Location');
        if (!locationUrl) {
            throw new Error('Geofence created (201), but API did not return a Location header.');
        }
    } else if (response.status === 200 && responseBodyText) {
        try {
            const body = JSON.parse(responseBodyText);
            const geofenceId = body.geofence_id;
            if (!geofenceId) {
                throw new Error('Geofence created (200), but API response did not contain a geofence_id.');
            }
            // Construct the full URL from the base API URL and the returned ID.
            locationUrl = `${api.apiUrl}/geofences/${geofenceId}`;
        } catch (e) {
            throw new Error(`Geofence created (200), but failed to parse geofence_id from response: ${responseBodyText}`);
        }
    } else {
        // This case should be rare if response.ok is true, but it's a safe fallback.
        throw new Error(`Geofence creation returned an unhandled success status: ${response.status}`);
    }

    // 4. Make a GET request to the new URL to fetch the full geofence details.
    const getRequestOptions: RequestInit = {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
    };
    
    const getResponse = await authedFetch(locationUrl, getRequestOptions, api);
    const getResponseBodyText = await getResponse.text();
    
    // Log this second API call.
    try {
        const urlObject = new URL(locationUrl);
        const endpointPath = urlObject.pathname + urlObject.search;
        logApiCall(api.addApiLog, endpointPath, getRequestOptions, getResponse, getResponseBodyText);
    } catch (e) {
        logApiCall(api.addApiLog, locationUrl, getRequestOptions, getResponse, getResponseBodyText);
    }
    
    if (!getResponse.ok) {
        throw new Error(`Geofence created, but failed to fetch it at ${locationUrl}: ${getResponse.status} ${getResponseBodyText}`);
    }

    // 5. Parse and return the newly created geofence.
    const newRawGeofence = JSON.parse(getResponseBodyText);
    const transformed = transformRawGeofence(newRawGeofence);
    if (!transformed) {
        throw new Error('Successfully fetched new geofence, but failed to parse it.');
    }
    
    return transformed;
};


export const updateGeofence = async (api: ApiContextType, geofence: Geofence, layer: any | null): Promise<Geofence> => {
    const url = `${api.apiUrl}/geofences/${geofence.uuid}`;
    
    const payload: { name: string; description: string; end: string | null; notification: string; geojson?: string } = {
        name: geofence.name,
        description: geofence.description,
        end: geofence.end,
        notification: geofence.notification,
    };

    // If a new shape layer is provided, convert it to geojson and include it in the payload.
    if (layer) {
        payload.geojson = layerToApiGeoJsonString(layer, geofence.description);
    }
    
    const requestOptions: RequestInit = {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
    };

    const response = await authedFetch(url, requestOptions, api);
    const responseBodyText = await response.text();
    
    logApiCall(api.addApiLog, `/geofences/${geofence.uuid}`, requestOptions, response, responseBodyText);

    if (!response.ok) {
        throw new Error(`Failed to update geofence ${geofence.uuid}: ${response.status} ${responseBodyText}`);
    }
    
    const updatedRawGeofence = JSON.parse(responseBodyText);
    const transformed = transformRawGeofence(updatedRawGeofence);
    if (!transformed) {
        throw new Error('Failed to parse updated geofence from API response.');
    }
    
    return transformed;
};

export const deleteGeofence = async (api: ApiContextType, geofenceUuid: string): Promise<void> => {
    const url = `${api.apiUrl}/geofences/${geofenceUuid}`;
    const requestOptions: RequestInit = {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
        },
    };

    const response = await authedFetch(url, requestOptions, api);
    // DELETE requests might not have a body, so read it but don't fail if it's empty.
    const responseBodyText = await response.text();

    logApiCall(api.addApiLog, `/geofences/${geofenceUuid}`, requestOptions, response, responseBodyText);

    // A successful DELETE should return 204 No Content or similar 2xx status.
    if (!response.ok) {
        throw new Error(`Failed to delete geofence ${geofenceUuid}: ${response.status} ${responseBodyText}`);
    }
};

export const getTripShareUrl = async (api: ApiContextType, uuid: string): Promise<string> => {
    const url = `${api.apiUrl}/ravens/${uuid}/trip-share`;
    const requestOptions: RequestInit = {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
    };

    const response = await authedFetch(url, requestOptions, api);
    const responseBodyText = await response.text();
    
    logApiCall(api.addApiLog, `/ravens/${uuid}/trip-share`, requestOptions, response, responseBodyText);

    if (!response.ok) {
        throw new Error(`Failed to generate trip share link for raven ${uuid}: ${response.status} ${responseBodyText}`);
    }
    
    try {
        const data = JSON.parse(responseBodyText);
        if (typeof data.url !== 'string') {
            throw new Error("API response did not contain a valid 'url' field.");
        }
        return data.url;
    } catch (e) {
        throw new Error(`Failed to parse trip share URL from API response: ${responseBodyText}`);
    }
};


/**
 * Processes an array of items with a given async processor function,
 * but limits the number of concurrent executions to avoid rate-limiting.
 * @param items The array of items to process.
 * @param processor An async function that takes an item and returns a promise with the result.
 * @param concurrency The maximum number of promises to run at the same time.
 * @returns A promise that resolves to an array of results in the same order as the input items.
 */
export async function processWithConcurrency<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number
): Promise<R[]> {
    const results: (R | undefined)[] = new Array(items.length);
    let currentIndex = 0;

    const processNext = async (): Promise<void> => {
        // Base case: no more items to process for this worker
        if (currentIndex >= items.length) {
            return;
        }

        const itemIndex = currentIndex++;
        const item = items[itemIndex];
        
        try {
            const result = await processor(item);
            results[itemIndex] = result;
        } catch (error) {
            console.error(`Error processing item at index ${itemIndex}:`, error);
            // Re-throw to ensure Promise.all rejects if any worker fails, halting the entire fetch process.
            throw error;
        }
        
        // Recursively call to process the next available item
        return processNext();
    };

    // Create a pool of workers that will each process items until the queue is empty
    const workers = Array(concurrency).fill(null).map(() => processNext());
    
    // Wait for all workers to complete their chains of promises
    await Promise.all(workers);
    
    return results as R[];
}
