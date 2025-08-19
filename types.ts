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

export interface RavenDetails extends RavenSummary {
  last_known_location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
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
