
import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = "https://railradar.in/api/v1";
const API_KEY = process.env.RAILRADAR_API_KEY;

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`${BASE_URL}/trains/live-map`, {
      headers: {
        'x-api-key': API_KEY,
      },
      // Revalidate every 60 seconds
      next: { revalidate: 60 }
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("RailRadar API Error:", errorData);
        return NextResponse.json({ error: `Failed to fetch train data: ${errorData.message || response.statusText}` }, { status: response.status });
    }

    const responseData = await response.json();

    if (responseData && Array.isArray(responseData.data)) {
        const trains = responseData.data.map((train: any) => ({
            train_number: train.train_number,
            train_name: train.train_name,
            latitude: train.current_lat, // Corrected from latitude
            longitude: train.current_lng, // Corrected from longitude
            speed: train.speed,
            delay: train.delay,
            status_summary: train.status_summary
        }));
        return NextResponse.json(trains);
    }

    console.error("Unexpected API response structure:", responseData);
    return NextResponse.json([]);
    
  } catch (error) {
    console.error('Error fetching from RailRadar API:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while fetching all train statuses.' }, { status: 500 });
  }
}
