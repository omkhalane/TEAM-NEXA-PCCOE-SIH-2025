# RailPulse - Live Train Tracking Platform

## Overview

RailPulse is a modern, real-time train tracking application built with Next.js. It provides users with live updates on train schedules, positions, and statuses across the Indian Railways network. The platform is designed to be fast, reliable, and user-friendly, offering a seamless experience for planning and tracking train journeys.

---

## Key Features

-   **Live Train Status:** Track the real-time location, speed, and delay of any train. The timeline view provides a detailed history of the train's journey, including arrival and departure times at each station.
-   **Trains Between Stations:** Easily find all available trains running between any two stations, complete with departure/arrival times and journey duration.
-   **Interactive Live Map:** Visualize the entire rail network with our live map. All active trains are displayed with color-coded icons indicating whether they are moving or stopped. Users can click on any train for quick details or search for a specific train to see its live position and full route overlay.
-   **Comprehensive Data:** The application is powered by the **RailRadar API**, ensuring access to accurate, real-time data for over 12,000 trains and 7,300 stations.
-   **Responsive Design:** The user interface is fully responsive, offering a seamless experience on desktops, tablets, and mobile devices.

---

## Technology Stack

The application is built with a modern, robust, and scalable technology stack:

-   **Frontend Framework:** **Next.js 15** with the App Router, leveraging React Server Components for optimal performance.
-   **Language:** **TypeScript** for type safety and improved developer experience.
-   **UI & Styling:**
    -   **Tailwind CSS** for a utility-first styling approach.
    -   **ShadCN UI** for a set of beautifully designed, accessible, and composable components.
-   **Mapping:** **Leaflet.js** with **React Leaflet** for creating the interactive live map.
-   **Backend:** **Next.js API Routes** are used to create server-side endpoints that securely communicate with the external RailRadar API.
-   **Data Source:** Real-time train data is sourced from the **RailRadar API**.

---

## Project Structure

The project follows a standard Next.js App Router structure:

-   `src/app/(pages)/`: Contains all the main application pages, such as the homepage, live status, and live map.
-   `src/app/api/`: Holds all backend API route handlers that act as a proxy to the external RailRadar API. This is where data fetching and formatting logic resides.
-   `src/components/`: Includes all reusable React components, organized into:
    -   `layout/`: for global components like the Navbar and Footer.
    -   `ui/`: for the ShadCN UI components.
    -   `live-map.tsx`: The specialized map component.
-   `public/`: Stores static assets like images and icons.
-   `indian-railways-*.json`: These root-level JSON files contain static data for all Indian railway stations and trains, used to power the search and autocomplete functionality.


