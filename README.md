# Lorry Driver Tracking App

A simple full-stack application for managing lorry drivers, tracking GPS routes, and recording trip statistics. The project contains:

- **Express + SQLite backend** for authentication, delivery assignments, trip logging, and history.
- **React (Vite) frontend** with dedicated dashboards for drivers and fleet administrators.
- Integrated GPS tracking using the browser's geolocation API with live route plotting on OpenStreetMap tiles.

## Features

### Driver dashboard
- Sign in and view assigned deliveries (pending or in-progress).
- Start a trip with one or more assigned deliveries.
- Automatic GPS logging (when the browser grants location permissions) with live map preview.
- Stop a trip to finalise statistics (distance, duration, deliveries completed).
- Review trip history, including detailed stats and route replay on a map.

### Admin dashboard
- Create driver accounts.
- Create deliveries and assign them to drivers.
- Monitor the delivery list with status indicators.
- View every recorded trip with aggregated stats, sortable table, and detailed map preview.

## Project structure

```
.
├── client   # React frontend (Vite)
└── server   # Express backend (SQLite)
```

## Getting started

> **Note:** The execution environment used for automated evaluation blocks direct access to the public npm registry. `npm install` commands therefore fail inside the container (HTTP 403). Run the installation steps locally to fetch dependencies.

### Backend

```bash
cd server
npm install        # install dependencies (requires internet access)
npm run init-db    # creates SQLite database with default admin/driver accounts
npm run dev        # start API with hot reload (uses nodemon)
```

The backend listens on `http://localhost:4000` and exposes REST endpoints under `/api`. Default accounts are:

- Admin: `admin@example.com` / `admin123`
- Driver: `driver@example.com` / `driver123`

### Frontend

```bash
cd client
npm install        # install dependencies (requires internet access)
npm run dev        # start Vite dev server (http://localhost:5173)
```

The Vite dev server proxies `/api/*` requests to the Express backend, so run both servers concurrently during development.

## Environment variables

The backend uses a default JWT secret. You can override it and the server port using environment variables:

```bash
PORT=4000 JWT_SECRET=your-secret npm start
```

## Database

SQLite database file `database.sqlite` is generated in the `server` directory. The schema includes tables for users, deliveries, delivery assignments, trips, and trip GPS points. You can inspect or backup the database with any SQLite tooling.

## Testing geolocation

The driver dashboard relies on the browser's `navigator.geolocation` API. When testing locally:

1. Use a browser that supports the Geolocation API.
2. Allow the site to access location data when prompted.
3. On desktops without GPS hardware, consider using browser dev tools to simulate location updates.

## Screenshots

_No static screenshots are included because map and geolocation functionality depend on runtime data. Run the application locally to explore the dashboards._

## License

This project is provided as-is for demonstration and evaluation purposes.
