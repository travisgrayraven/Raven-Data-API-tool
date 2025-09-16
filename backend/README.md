# RavenView Backend Proxy

This directory contains a simple Node.js Express server that acts as a proxy for the RavenView frontend application.

## Purpose

The Raven Data API provides links to event media (images, videos) via authenticated API endpoints. For security reasons, web browsers enforce a Cross-Origin Resource Sharing (CORS) policy that prevents a web application running on one domain from directly fetching resources from another if not configured to allow it.

This proxy server solves the problem by providing an endpoint that the frontend can call. The server then makes the authenticated API call to the Raven media endpoint on behalf of the browser and streams the media back. This completely avoids browser-based CORS issues.

## Setup and Running Locally

1.  **Prerequisites:** You need to have [Node.js](https://nodejs.org/) installed on your machine.

2.  **Install Dependencies:** Navigate to this `backend` directory in your terminal and run:
    ```bash
    npm install
    ```

3.  **Start the Server:**
    ```bash
    npm start
    ```

    The server will start, typically on port 3001. The frontend application is configured to use this proxy when running locally.

## API Endpoint

### `POST /proxy/media`

This is the main endpoint for fetching media. The frontend sends a POST request with a JSON body containing the necessary information to make the authenticated call to the Raven API.

**Request Body:**

```json
{
  "apiUrl": "https://api.beta3.klashwerks.com/user-v1",
  "ravenUuid": "some-raven-uuid",
  "mediaId": "12345",
  "token": "your-auth-token"
}
```

The proxy server uses this information to construct and execute the full, authenticated request, then streams the media back in the response.

## Deployment to Google Cloud Run

Google Cloud Run is an excellent choice for deploying this server as it's a fully managed, serverless platform that automatically scales and is cost-effective (with a generous free tier).

**Prerequisites:**
*   A Google Cloud Platform (GCP) project.
*   The `gcloud` command-line tool installed and authenticated (`gcloud auth login`).
*   Billing enabled for your GCP project.

**Step-by-Step Deployment:**

1.  **Enable Required APIs:** In your GCP project, make sure the Cloud Run API and Cloud Build API are enabled. You can do this via the web console or with `gcloud`:
    ```bash
    gcloud services enable run.googleapis.com
    gcloud services enable cloudbuild.googleapis.com
    ```

2.  **Create a `Dockerfile`:** In this `backend` directory, create a new file named `Dockerfile` (no extension) with the following content:

    ```Dockerfile
    # Use the official Node.js 18 image as a parent image
    FROM node:18-slim

    # Set the working directory in the container
    WORKDIR /usr/src/app

    # Copy package.json and package-lock.json
    COPY package*.json ./

    # Install dependencies
    RUN npm install --only=production

    # Copy the rest of the application's source code
    COPY . .

    # Make your app's port available to the outside world
    EXPOSE 8080

    # Define the command to run your app
    CMD [ "node", "server.js" ]
    ```
    *Note: Cloud Run expects containers to listen on port `8080` by default. Our server uses `process.env.PORT || 3001`, and Cloud Run automatically sets the `PORT` environment variable to `8080`.*

3.  **Deploy from the Command Line:** Navigate to the `backend` directory in your terminal and run the following `gcloud` command. Replace `[PROJECT_ID]` with your GCP Project ID and `[REGION]` with your preferred region (e.g., `us-central1`).

    ```bash
    gcloud run deploy ravenview-proxy \
      --source . \
      --platform managed \
      --region [REGION] \
      --project [PROJECT_ID] \
      --allow-unauthenticated
    ```
    *   `ravenview-proxy`: This is the name of your new service.
    *   `--source .`: This tells gcloud to build a container from the source code in the current directory.
    *   `--allow-unauthenticated`: This makes the proxy publicly accessible. This is necessary for your frontend application to be able to call it.

4.  **Get the Service URL:** After the deployment completes (it may take a few minutes), the command will output the **Service URL**. It will look something like this: `https://ravenview-proxy-a1b2c3d4ef-uc.a.run.app`.

5.  **Update Frontend:** You will need to update your frontend application to use this new deployed URL instead of the local proxy URL. The file `components/RavenDetailView.tsx` has a `PROXY_URL` constant that should be updated with your service URL.