import React from 'react';

export interface RavenSummary {
  uuid: string;
  name: string;
  imei: string;
  serial_number: string;
  iccid: string;
  thing_name: string;
  vehicle_vin?: string;
  vehicle_id?: string;
}

export interface VehicleInfo {
    make: string;
    model: string;
    year: string;
}

export interface RavenDetails extends RavenSummary {
  online?: boolean;
  engineOn?: boolean;
  unplugged?: boolean;
  last_known_location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  last_known_obd_snapshot?: {
    timestamp: string;
    odometer_km?: number;
    fuel_level_percentage?: number;
  };
  vehicle_info?: VehicleInfo | null;
}

export interface ApiCredentials {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
}

export interface ApiLogEntry {
  id: number;
  timestamp: string;
  endpoint: string;
  request: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
  response: {
    ok: boolean;
    status: number;
    statusText: string;
    body: string;
  };
}

export interface RavenEvent {
  event_type: string;
  event_timestamp: string;
  road_media_ids?: string[];
  cabin_media_ids?: string[];
  latitude?: number;
  longitude?: number;
  [key: string]: any; // for other event properties
}

export interface RavenSettings {
    [key: string]: any; // Generic settings object
}

export interface ApiContextType {
    apiUrl: string;
    token: string;
    addApiLog: (log: ApiLogEntry) => void;
    refreshToken: () => Promise<string>;
}

export interface Geofence {
  uuid: string;
  name: string;
  description: string;
  shape_type: 'POLYGON' | 'CIRCLE';
  shape_data: {
    coordinates?: [number, number][][];
    center?: [number, number];
    radius?: number;
  };
  start: string;
  end: string | null;
  notification: string; // e.g., 'ENTER', 'EXIT', 'ENTER,EXIT', or ''
}

export interface GeofenceFormData {
  name: string;
  description: string;
  end: string; // YYYY-MM-DD format from date input, or "" for null
  notification: string;
}


// --- Web Component Type Definitions ---

// FIX: Correctly type the custom web component to resolve the JSX.IntrinsicElements error.
// The props for the web component are defined, and then `React.DetailedHTMLProps` is used
// within the JSX namespace declaration to correctly include all standard HTML attributes
// and the special `ref` prop needed for web components in React.
interface RcLivePreviewViewerProps extends React.HTMLAttributes<HTMLElement> {
    apidomain?: string;
    sessiontoken?: string;
    ravenid?: string;
    activecamera?: 'road' | 'cabin';
    inactivitytimeoutseconds?: string;
}

// Add props for the streaming video player component
interface RcStreamingVideoPlayerProps extends React.HTMLAttributes<HTMLElement> {
    apidomain?: string;
    sessiontoken?: string;
    ravenid?: string;
    activecamera?: 'road' | 'cabin';
    starttimestamp?: string;
    seekintervalseconds?: string;
    audiosupported?: boolean;
    muted?: boolean;
    inactivitytimeoutseconds?: string;
    forcereporting?: boolean;
}


// Extend JSX to include the custom web component
declare global {
    namespace JSX {
        // FIX: Corrected a typo in the JSX namespace from `IntrinisicElements` to `IntrinsicElements` to allow TypeScript to recognize the custom web components.
        interface IntrinsicElements {
            'rc-live-preview-viewer': React.DetailedHTMLProps<RcLivePreviewViewerProps, HTMLElement>;
            'rc-streaming-video-player': React.DetailedHTMLProps<RcStreamingVideoPlayerProps, HTMLElement>;
        }
    }
}