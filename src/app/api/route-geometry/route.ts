import { NextRequest, NextResponse } from 'next/server';
import allStations from '../../../../indian-railway-stations-2025-09-15.json';

const BASE_URL = "https://railradar.in/api/v1";
const API_KEY = process.env.RAILRADAR_API_KEY;

// Create a lookup map for faster station coordinate retrieval
const stationCoords: { [key: string]: { latitude: number; longitude: number } } = {};
allStations.forEach((station: any) => {
    if (station.latitude && station.longitude) {
        stationCoords[station.value] = {
            latitude: station.latitude,
            longitude: station.longitude,
        };
    }
});


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trainNo = searchParams.get('trainNo');

  if (!trainNo) {
    return NextResponse.json({ error: 'Missing train number' }, { status: 400 });
  }
  
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  try {
    // 1. Fetch the train's schedule to get the list of station codes
    const scheduleResponse = await fetch(`${BASE_URL}/trains/${trainNo}`, {
      headers: {
        'x-api-key': API_KEY,
      },
       // Cache schedule data for a day
      next: { revalidate: 86400 }
    });

    if (!scheduleResponse.ok) {
        const errorData = await scheduleResponse.json();
        return NextResponse.json({ error: `Failed to fetch train schedule: ${errorData.message || scheduleResponse.statusText}` }, { status: scheduleResponse.status });
    }
    
    const scheduleData = await scheduleResponse.json();
    const routeStops = scheduleData?.data?.train?.route;

    if (!routeStops || !Array.isArray(routeStops)) {
      return NextResponse.json({ error: 'Could not find route information for this train.' }, { status: 404 });
    }

    // 2. Map station codes to coordinates
    const coordinates: [number, number][] = routeStops
      .map((stop: any) => {
        const stationInfo = stationCoords[stop.station.code];
        if (stationInfo) {
          // GeoJSON format is [longitude, latitude]
          return [stationInfo.longitude, stationInfo.latitude];
        }
        return null;
      })
      .filter((coord): coord is [number, number] => coord !== null);

    if (coordinates.length < 2) {
      return NextResponse.json({ error: 'Not enough station coordinates found to create a route.' }, { status: 404 });
    }

    // 3. Construct and return the GeoJSON LineString
    const geoJsonData = {
      type: "LineString",
      coordinates: coordinates,
    };

    return NextResponse.json({ data: geoJsonData });

  } catch (error) {
    console.error('Error creating route geometry:', error);
    return NextResponse.json({ error: 'Failed to process route geometry' }, { status: 500 });
  }
}
