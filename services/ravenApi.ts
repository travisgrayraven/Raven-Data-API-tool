import type { ApiCredentials, RavenSummary, RavenDetails, ApiLogEntry } from '../types';

interface TokenResponse {
  token: string;
}

let logIdCounter = 0;

const logApiCall = (
  onLog: (log: ApiLogEntry) => void,
  endpoint: string,
  requestOptions: RequestInit,
  response: Response,
  responseBodyText: string
) => {
  onLog({
    id: logIdCounter++,
    timestamp: new Date().toISOString(),
    endpoint,
    request: {
      method: requestOptions.method || 'GET',
      headers: requestOptions.headers as Record<string, string>,
      body: requestOptions.body as string | undefined,
    },
    response: {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: responseBodyText,
    },
  });
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
  return data.results || [];
};

export const getRavenDetails = async (apiUrl: string, token: string, uuid: string, onLog: (log: ApiLogEntry) => void): Promise<RavenDetails> => {
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
    return data;
};