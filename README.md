# Raven Fleet Manager

An application to view and manage vehicle data from Raven video telematics devices. This serves as a demonstration and starting point for developers looking to integrate with the Raven API.

## Description

This application prompts for Raven API credentials (API URL, Integration Key, and Integration Secret). After authenticating, it presents a dashboard of all associated vehicles. From there, you can drill down into a detailed view for each vehicle to see its location on a map, view recent events with media, and manage device settings.

## Features

-   **Credential Management:** A simple form to input and use API credentials for a session.
-   **Vehicle Dashboard:** A summary view of all vehicles in your fleet, showing their name and online status.
-   **Detailed Vehicle View:** A tabbed interface for each vehicle, including:
    -   **Map:** Shows the last known location of the vehicle.
    -   **Events:** Lists recent events and allows viewing of associated media (images/videos).
    -   **Settings:** An editor to view and modify the device's configuration.
-   **Dark/Light Mode:** A theme toggle to switch between dark and light modes, with the preference saved in your browser.
-   **API Exchange Log:** A panel that shows the details of every API call made, including the request method, endpoint, status, and request/response bodies.
-   **Backend Proxy:** Includes a simple Node.js proxy to securely handle authenticated media requests to the Raven API, avoiding browser CORS issues.

## Project Structure

-   `index.html`: The main entry point of the application.
-   `index.tsx`: The main React application entry point.
-   `App.tsx`: The root React component containing the main application logic, routing, and state management.
-   `components/`: Contains reusable React components for the UI.
-   `hooks/`: Contains custom React hooks (e.g., `useTheme`).
-   `services/`: Contains the logic for interacting with the Raven API.
-   `types.ts`: TypeScript type definitions for the data structures.
-   `backend/`: Contains the Node.js proxy server.
    -   `server.js`: The Express server code.
    -   `package.json`: Backend dependencies.
    -   `README.md`: Instructions for running and deploying the backend.

## Getting Started

This project consists of a frontend React application and a backend Node.js proxy.

### Running the Frontend

The frontend is a self-contained web application built with React and TypeScript, using TailwindCSS for styling. It requires no complex build setup.

1.  **Open `index.html` in your web browser.**
    You can do this by dragging the file into your browser window or, for best results (especially for the proxy to work), using a simple local server like `live-server` from npm.

### Running the Backend (Required for Media Viewing)

1.  **Navigate to the `backend` directory:**
    ```bash
    cd backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the server:**
    ```bash
    npm start
    ```
The proxy server will now be running (usually on port 3001) and the frontend will be able to fetch event media. For deployment instructions, see the `backend/README.md` file.

## How to Use the App

1.  Open the application in your browser and start the backend server.
2.  Enter your Raven API `API URL`, `Integration Key`, and `Integration Secret` into the form.
3.  Click "Fetch Vehicle Data".
4.  You will see a dashboard of your vehicles. Click on any vehicle to see its details.
5.  Use the tabs to navigate between the Map, Events, and Settings.
6.  Use the toggle in the top-right corner to switch between light and dark themes.