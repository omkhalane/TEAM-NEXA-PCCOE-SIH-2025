
import { NextRequest, NextResponse } from 'next/server';

// This URL should point to your deployed Firebase Function.
// For local development, it points to the Firebase Emulator suite.
const FUNCTION_URL = process.env.NODE_ENV === 'development' 
    ? 'http://127.0.0.1:5001/railpulse-dss/us-central1/triggerDssOptimization' 
    : process.env.DSS_TRIGGER_FUNCTION_URL;

export async function POST(req: NextRequest) {
  if (!FUNCTION_URL) {
    console.error("DSS_TRIGGER_FUNCTION_URL is not set in environment variables.");
    return NextResponse.json({ error: 'DSS trigger function URL is not configured.' }, { status: 500 });
  }
  
  try {
    const body = await req.json();
    const corridorId = body.corridorId;

    if (!corridorId) {
      return NextResponse.json({ error: 'Missing corridorId in request body' }, { status: 400 });
    }

    // Forward the request to the Google Cloud Function
    const functionResponse = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ corridorId }),
    });

    if (!functionResponse.ok) {
        const errorData = await functionResponse.text();
        console.error("Error from Cloud Function:", errorData);
        return NextResponse.json({ error: 'Error calling DSS trigger function', details: errorData }, { status: functionResponse.status });
    }
    
    const responseData = await functionResponse.json();
    return NextResponse.json(responseData, { status: functionResponse.status });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
