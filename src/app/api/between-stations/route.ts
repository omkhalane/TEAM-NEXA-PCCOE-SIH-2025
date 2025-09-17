import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = "https://railradar.in/api/v1";
const API_KEY = process.env.RAILRADAR_API_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from or to station code' }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`${BASE_URL}/trains/between?from=${from}&to=${to}`, {
      headers: {
        'x-api-key': API_KEY,
      },
    });

    if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json({ error: `Failed to fetch train data: ${errorData.message || response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from RailRadar API:', error);
    return NextResponse.json({ error: 'Failed to fetch train status from external API' }, { status: 500 });
  }
}
