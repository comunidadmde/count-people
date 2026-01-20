import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export interface CounterData {
  doorId: string;
  count: number;
  timestamp: Date;
}

// GET - Retrieve all counters
export async function GET() {
  try {
    const db = await getDatabase();
    const counters = await db
      .collection('counters')
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: counters });
  } catch (error) {
    console.error('Error fetching counters:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch counters',
        details: errorMessage.includes('MongoDB') || errorMessage.includes('Mongo')
          ? 'MongoDB connection error. Please check your MONGODB_URI in .env.local'
          : errorMessage
      },
      { status: 500 }
    );
  }
}

// POST - Save counter data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doorId, count } = body;

    if (!doorId || typeof count !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid data. doorId and count are required.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const counterData: CounterData = {
      doorId,
      count,
      timestamp: new Date(),
    };

    const result = await db.collection('counters').insertOne(counterData);

    return NextResponse.json({
      success: true,
      data: { ...counterData, _id: result.insertedId },
    });
  } catch (error) {
    console.error('Error saving counter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save counter',
        details: errorMessage.includes('MongoDB') || errorMessage.includes('Mongo')
          ? 'MongoDB connection error. Please check your MONGODB_URI in .env.local'
          : errorMessage
      },
      { status: 500 }
    );
  }
}
