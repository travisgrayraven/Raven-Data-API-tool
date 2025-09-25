/// <reference types="react" />
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

export type Tab = 'map' | 'preview' | 'media' | 'events' | 'settings' | 'logs';


// --- Web Component Type Definitions ---

/**
 * Props for the rc-live-preview-viewer web component.
 */
interface RcLivePreviewViewerProps extends React.HTMLAttributes<HTMLElement> {
    apidomain?: string;
    sessiontoken?: string;
    ravenid?: string;
    activecamera?: 'road' | 'cabin';
    inactivitytimeoutseconds?: string;
}

/**
 * Props for the rc-streaming-video-player web component.
 */
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

/**
 * Props for the rc-enhanced-video-access web component.
 */
interface RcEnhancedVideoAccessProps extends React.HTMLAttributes<HTMLElement> {
    apidomain: string;
    sessiontoken: string;
    ravenid: string;
    starttimestamp: string;
    endtimestamp: string;
    hidepreviewpopup?: boolean;
    hidevideoslist?: boolean;
    forcereporting?: boolean;
}

// Extend the global JSX namespace to include our custom elements.
declare global {
    namespace JSX {
        // FIX: Extend React's original IntrinsicElements interface to avoid overwriting it.
        // This resolves numerous errors where standard HTML tags were not recognized.
        interface IntrinsicElements extends React.JSX.IntrinsicElements {
            'rc-live-preview-viewer': React.DetailedHTMLProps<RcLivePreviewViewerProps, HTMLElement>;
            'rc-streaming-video-player': React.DetailedHTMLProps<RcStreamingVideoPlayerProps, HTMLElement>;
            'rc-enhanced-video-access': React.DetailedHTMLProps<RcEnhancedVideoAccessProps, HTMLElement>;
        }
    }
}
