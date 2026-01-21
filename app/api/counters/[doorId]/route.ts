import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// GET - Get count for a specific door
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doorId: string }> }
) {
  try {
    const { doorId } = await params;
    const db = await getDatabase();
    
    // Count the number of records for this door
    const count = await db.collection('counters').countDocuments({ doorId });
    
    // Get the latest record for timestamp
    const latestCounter = await db
      .collection('counters')
      .findOne(
        { doorId },
        { sort: { timestamp: -1 } }
      );

    // Get door info
    const door = await db.collection('doors').findOne({ doorId });

    return NextResponse.json({
      success: true,
      data: {
        doorId,
        count,
        lastUpdated: latestCounter?.timestamp || null,
        door: door || null,
      },
    });
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
