import { NextRequest, NextResponse } from 'next/server';
import stations from '../../../../indian-railway-stations-2025-09-15.json';
import trains from '../../../../indian-railways-trains-2025-09-15.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query')?.toLowerCase();
  const type = searchParams.get('type'); // 'trains' or 'stations'

  if (!query || !type) {
    return NextResponse.json({ error: 'Missing query or type' }, { status: 400 });
  }

  let suggestions: { value: string; label: string }[] = [];

  try {
    if (type === 'trains') {
      suggestions = trains
        .filter(
          (train) =>
            train.label.toLowerCase().includes(query) ||
            train.value.toLowerCase().includes(query)
        )
        .map((train) => ({
          value: train.value,
          label: `${train.value} - ${train.label}`,
        }))
        .slice(0, 50);
    } else {
      // stations
      suggestions = stations
        .filter(
          (station) =>
            station.label.toLowerCase().includes(query) ||
            station.value.toLowerCase().includes(query)
        )
        .map((station) => ({
          value: station.value,
          label: `${station.value} - ${station.label}`,
        }))
        .slice(0, 50);
    }

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error reading or filtering local JSON data:', error);
    return NextResponse.json(
      { error: 'Failed to process search results from local data' },
      { status: 500 }
    );
  }
}
