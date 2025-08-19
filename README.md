# Raven Telematics Dashboard

A simple application to view vehicle data from Raven video telematics devices. This serves as a demonstration and starting point for developers looking to integrate with the Raven API.

**Live Demo:** [Link to your hosted application here]

## Description

This application prompts for Raven API credentials (API URL, Integration Key, and Integration Secret), fetches an authentication token, retrieves a list of associated vehicles (Ravens), and then fetches detailed information for each vehicle. The raw API requests and responses are logged for easy inspection.

## Features

-   **Credential Management:** A simple form to input and use API credentials for a session.
-   **API Interaction:** Demonstrates the three key steps for fetching vehicle data:
    1.  Authenticating and retrieving a bearer token.
    2.  Fetching a list of all associated vehicles.
    3.  Fetching detailed data for each individual vehicle.
-   **API Exchange Log:** A collapsible panel that shows the details of every API call made, including the request method, endpoint, status, and request/response bodies. This is an invaluable tool for debugging and understanding the API flow.

## Getting Started

This project is a self-contained web application built with React and TypeScript, using TailwindCSS for styling. It requires no complex build setup to run locally.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd YOUR_REPOSITORY
    ```
3.  **Open `index.html` in your web browser.**
    You can do this by dragging the file into your browser window or using a simple local server.

## How to Use the App

1.  Open the application in your browser.
2.  Enter your Raven API `API URL`, `Integration Key`, and `Integration Secret` into the form. The form is pre-filled with example credentials for convenience.
3.  Click "Fetch Vehicle Data".
4.  The application will perform the necessary API calls.
5.  If successful, a confirmation message will appear indicating how many vehicles were found.
6.  Expand the "API Exchange Log" to view the raw request and response data for each step of the process.

## Project Structure

-   `index.html`: The main entry point of the application. Includes all CDN links and the root div for React.
-   `index.tsx`: The main React application entry point where the App component is rendered.
-   `App.tsx`: The root React component containing the main application logic and state management.
-   `components/`: Contains reusable React components.
    -   `CredentialsForm.tsx`: The form for entering API credentials.
-   `services/`: Contains the logic for interacting with the Raven API.
    -   `ravenApi.ts`: Functions for fetching the token and vehicle data (`getToken`, `getRavens`, `getRavenDetails`).
-   `types.ts`: TypeScript type definitions for the data structures used throughout the application (e.g., `ApiCredentials`, `RavenDetails`).
