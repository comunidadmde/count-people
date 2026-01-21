import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export interface DoorData {
  doorId: string;
  doorName: string;
  auditorium: string;
}

// GET - Get all doors with their auditoriums
export async function GET() {
  try {
    const db = await getDatabase();
    const doors = await db
      .collection('doors')
      .find({})
      .toArray();

    return NextResponse.json({ success: true, data: doors });
  } catch (error) {
    console.error('Error fetching doors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch doors' },
      { status: 500 }
    );
  }
}

// POST - Create or update a door with an auditorium
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doorId, doorName, auditorium } = body;

    if (!doorId || !doorName || !auditorium || auditorium.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid data. doorId, doorName, and auditorium are required.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const doorData: DoorData = {
      doorId,
      doorName,
      auditorium: auditorium.trim(),
    };

    // Upsert the door
    await db.collection('doors').updateOne(
      { doorId },
      { $set: doorData },
      { upsert: true }
    );

    return NextResponse.json({ success: true, data: doorData });
  } catch (error) {
    console.error('Error saving door:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save door' },
      { status: 500 }
    );
  }
}
