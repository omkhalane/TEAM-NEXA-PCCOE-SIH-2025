
import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = "https://railradar.in/api/v1";
const API_KEY = process.env.RAILRADAR_API_KEY;

// Helper to format minutes from midnight into HH:MM
const formatTime = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined || isNaN(minutes) || minutes < 0) return null;
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trainNo = searchParams.get('trainNo');
  const date = searchParams.get('date');

  if (!trainNo) {
    return NextResponse.json({ error: 'Missing train number' }, { status: 400 });
  }
   if (!date) {
    return NextResponse.json({ error: 'Missing journey date' }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  try {
    // Fetch both live instance data and schedule data in parallel
    const [instanceResponse, scheduleResponse] = await Promise.all([
        fetch(`${BASE_URL}/trains/${trainNo}/instances`, { headers: { 'x-api-key': API_KEY } }),
        fetch(`${BASE_URL}/trains/${trainNo}/schedule?journeyDate=${date}`, { headers: { 'x-api-key': API_KEY } })
    ]);

    if (!instanceResponse.ok) {
      const errJson = await instanceResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Failed to fetch live instance: ${errJson.message || instanceResponse.statusText}` },
        { status: instanceResponse.status }
      );
    }
    if (!scheduleResponse.ok) {
      const errJson = await scheduleResponse.json().catch(() => ({}));
       return NextResponse.json(
        { error: `Failed to fetch schedule: ${errJson.message || scheduleResponse.statusText}` },
        { status: scheduleResponse.status }
      );
    }

    const instanceResult = await instanceResponse.json();
    const scheduleData = await scheduleResponse.json();

    // Use the first running instance for live details
    const liveInstance = instanceResult?.data?.[0];
    const trainSchedule = scheduleData?.data;

    if (!liveInstance) {
      return NextResponse.json({ error: 'Live train data not available for this train at the moment.' }, { status: 404 });
    }
     if (!trainSchedule || !trainSchedule.route) {
        return NextResponse.json({ error: 'Train schedule not found for the given date.' }, { status: 404 });
    }

    // Combine live data with schedule for timeline
    const liveTimelineMap: { [key: string]: any } = {};
    if (liveInstance.route) {
        liveInstance.route.forEach((stop: any) => {
            liveTimelineMap[stop.station.code] = stop;
        });
    }
    
    // Format the data to match the frontend's expectation
    const formattedData = {
      train: {
        train_name: liveInstance.train?.trainName || trainSchedule.train?.name || 'N/A',
        train_number: liveInstance.train?.trainNumber || trainSchedule.train?.number || trainNo,
      },
      current_station_name: liveInstance.position?.previousStation?.stationName || 'N/A',
      latitude: liveInstance.position?.currentLocation?.lat ?? null,
      longitude: liveInstance.position?.currentLocation?.lng ?? null,
      delay: liveInstance.overallDelayMinutes ?? 0,
      speed: liveInstance.position?.speedOnSectionKmph ?? 0,
      next_station_name: liveInstance.position?.nextStation?.stationName || 'Destination Reached',
      current_platform: liveInstance.position?.previousStation?.platform || null,
      last_updated_at: liveInstance.lastUpdatedAt || new Date().toISOString(),
      status_summary: liveInstance.position?.summary || 'N/A',
      timeline: trainSchedule.route?.map((stop: any) => {
        const liveStopInfo = liveTimelineMap[stop.station.code];
        
        let status = 'Upcoming';
        if (liveStopInfo?.actualDeparture) {
            status = 'Departed';
        } else if (liveStopInfo?.actualArrival) {
            status = 'Arrived';
        } else if (liveInstance.position?.previousStation?.stationCode === stop.station.code) {
             status = 'Current';
        }

        return {
            station_name: `${stop.station.name} (${stop.station.code})`,
            scheduled_arrival: formatTime(stop.schedule?.arrival),
            actual_arrival: formatTime(liveStopInfo?.arrivalMinutes),
            scheduled_departure: formatTime(stop.schedule?.departure),
            actual_departure: formatTime(liveStopInfo?.departureMinutes),
            delay: liveStopInfo?.delayArrivalMinutes ?? liveStopInfo?.delayDepartureMinutes ?? 0,
            platform: liveStopInfo?.platform || stop.platform || null,
            status: status,
            halt_minutes: stop.schedule?.haltMinutes || 0,
        }
      }) || []
    };

    return NextResponse.json({ data: formattedData });
  } catch (err) {
    console.error('RailRadar API fetch error:', err);
    return NextResponse.json({ error: 'Unexpected error while fetching train data.' }, { status: 500 });
  }
}
