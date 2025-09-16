// A simple Node.js Express server to act as a proxy for fetching Raven API media.
// This is necessary to avoid CORS issues when the browser tries to fetch
// media from authenticated API endpoints.

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
// Use a port from environment variables for deployment flexibility, default to 3001
const PORT = process.env.PORT || 3001;

// Enable CORS for the frontend to call this proxy
app.use(cors());
// Enable JSON body parsing for POST requests
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Proxy endpoint for media - updated to handle the API's redirect-to-S3 logic.
app.post('/proxy/media', async (req, res) => {
  console.log('--- New Media Proxy Request ---');
  const { apiUrl, ravenUuid, mediaId, token } = req.body;

  if (!apiUrl || !ravenUuid || !mediaId || !token) {
    console.error('Proxy request failed: Missing required body parameters.');
    return res.status(400).json({ error: 'apiUrl, ravenUuid, mediaId, and token are required' });
  }

  // Log received data for debugging
  console.log(`Received apiUrl: ${apiUrl}`);
  console.log(`Received ravenUuid: ${ravenUuid}`);
  console.log(`Received mediaId: ${mediaId}`);
  console.log(`Received token (first 10 chars): ${token.substring(0, 10)}...`);

  try {
    // Construct the initial URL to the Raven API media endpoint, mimicking the Python script.
    // The `apiUrl` contains the full base path (e.g., https://.../user-v1)
    const initialUrl = `${apiUrl}/ravens/${ravenUuid}/media/${mediaId}/content`;

    console.log(`Attempting to fetch from initial URL: ${initialUrl}`);

    const requestHeaders = {
      'Authorization': `Bearer ${token}`
    };

    console.log('Sending headers:', requestHeaders);

    // Step 1: Make the authenticated request to the Raven API.
    const apiResponse = await fetch(initialUrl, {
      headers: requestHeaders,
      redirect: 'manual'
    });

    console.log(`Received response from Raven API. Status: ${apiResponse.status} ${apiResponse.statusText}`);
    console.log('Received response headers:', Object.fromEntries(apiResponse.headers.entries()));

    // We expect a redirect response (status code 3xx).
    if (apiResponse.status < 300 || apiResponse.status >= 400) {
        console.error(`Expected a redirect from Raven API, but got status ${apiResponse.status}`);
        const errorBody = await apiResponse.text();
        console.error(`Error body from Raven API: ${errorBody}`);
        return res.status(apiResponse.status).send(`API did not provide a media redirect: ${errorBody || apiResponse.statusText}`);
    }

    const s3Url = apiResponse.headers.get('location');
    if (!s3Url) {
        console.error('API responded with a redirect but did not provide a Location header.');
        return res.status(500).send('API responded with a redirect but did not provide a Location header.');
    }

    console.log(`Redirecting to S3 URL: ${s3Url}`);

    // Step 2: Make a new, clean request to the S3 URL.
    const s3Response = await fetch(s3Url);

    if (!s3Response.ok) {
      const errorBody = await s3Response.text();
      console.error(`S3 fetch error from ${s3Url}: ${s3Response.status} ${s3Response.statusText}`, errorBody);
      return res.status(s3Response.status).send(`Error from media storage: ${s3Response.statusText}`);
    }

    console.log(`Successfully fetched from S3. Content-Type: ${s3Response.headers.get('content-type')}. Piping response to client.`);
    console.log('--- Media Proxy Request Finished ---');
    
    // Step 3: Stream the media content from S3 back to the client.
    res.setHeader('Content-Type', s3Response.headers.get('content-type') || 'application/octet-stream');
    const contentLength = s3Response.headers.get('content-length');
    if (contentLength) {
        res.setHeader('Content-Length', contentLength);
    }
    s3Response.body.pipe(res);

  } catch (error) {
    console.error('Proxy error:', error);
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
        return res.status(400).json({ error: 'The provided apiUrl is not a valid URL.'});
    }
    res.status(500).json({ error: 'An internal error occurred in the proxy server.' });
  }
});


// Deprecated S3 proxy endpoint.
app.get('/proxy', (req, res) => {
  res.status(410).send('This S3 proxy GET endpoint is deprecated. Please use the POST /proxy/media endpoint.');
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});