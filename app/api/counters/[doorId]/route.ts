import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// GET - Get latest count for a specific door
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doorId: string }> }
) {
  try {
    const { doorId } = await params;
    const db = await getDatabase();
    const latestCounter = await db
      .collection('counters')
      .findOne(
        { doorId },
        { sort: { timestamp: -1 } }
      );

    if (!latestCounter) {
      return NextResponse.json({
        success: true,
        data: { doorId, count: 0 },
      });
    }

    return NextResponse.json({ success: true, data: latestCounter });
  } catch (error) {
    console.error('Error fetching door counter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch door counter',
        details: errorMessage.includes('MongoDB') || errorMessage.includes('Mongo') 
          ? 'MongoDB connection error. Please check your MONGODB_URI in .env.local'
          : errorMessage
      },
      { status: 500 }
    );
  }
}
