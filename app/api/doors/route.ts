import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export interface DoorData {
  doorId: string;
  doorName: string;
  auditorium: string;
  password: string;
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
    const { doorId, doorName, auditorium, password } = body;

    if (!doorId || !doorName || !auditorium || auditorium.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid data. doorId, doorName, and auditorium are required.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if door exists
    const existingDoor = await db.collection('doors').findOne({ doorId });
    
    // Password is required for new doors, optional for updates (to keep current password)
    if (!existingDoor && (!password || password.trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'Password is required for new doors.' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Partial<DoorData> = {
      doorId,
      doorName,
      auditorium: auditorium.trim(),
    };

    // Only update password if provided (for new doors or when changing password)
    if (password && password.trim() !== '') {
      updateData.password = password.trim();
    } else if (existingDoor) {
      // Keep existing password if not provided
      updateData.password = existingDoor.password;
    }

    // Upsert the door
    await db.collection('doors').updateOne(
      { doorId },
      { $set: updateData },
      { upsert: true }
    );

    // Don't return password in response
    const { password: _, ...doorDataWithoutPassword } = updateData;
    return NextResponse.json({ success: true, data: doorDataWithoutPassword });
  } catch (error) {
    console.error('Error saving door:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save door' },
      { status: 500 }
    );
  }
}
