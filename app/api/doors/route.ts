import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface DoorData {
  _id?: string;
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

    // Convert _id to string for JSON serialization
    const doorsWithStringId = doors.map(door => ({
      ...door,
      _id: door._id.toString(),
    }));

    return NextResponse.json({ success: true, data: doorsWithStringId });
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
    const { _id, doorId, doorName, auditorium, password } = body;

    if (!doorName || !auditorium || auditorium.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid data. doorName and auditorium are required.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    let existingDoor = null;
    let query: any = {};

    // If _id is provided, use it for editing (MongoDB ObjectId)
    if (_id) {
      try {
        query._id = new ObjectId(_id);
        existingDoor = await db.collection('doors').findOne(query);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid _id format.' },
          { status: 400 }
        );
      }
    } else {
      // For new doors, use doorName to generate doorId if not provided
      const generatedDoorId = doorId || doorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      query.doorId = generatedDoorId;
      existingDoor = await db.collection('doors').findOne({ doorId: generatedDoorId });
    }
    
    // Password is required for new doors, optional for updates (to keep current password)
    if (!existingDoor && (!password || password.trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'Password is required for new doors.' },
        { status: 400 }
      );
    }

    // Generate doorId from doorName if not provided and it's a new door
    const finalDoorId = doorId || (existingDoor?.doorId) || doorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Build update object
    const updateData: Partial<DoorData> = {
      doorId: finalDoorId,
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

    // Update or insert the door
    if (_id && existingDoor) {
      // Update existing door by _id
      await db.collection('doors').updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
      );
    } else {
      // Upsert by doorId for new doors
      await db.collection('doors').updateOne(
        { doorId: finalDoorId },
        { $set: updateData },
        { upsert: true }
      );
    }

    // Get the updated door to return with _id
    const updatedDoor = await db.collection('doors').findOne(
      _id ? { _id: new ObjectId(_id) } : { doorId: finalDoorId }
    );

    // Don't return password in response
    const { password: _, ...doorDataWithoutPassword } = updatedDoor as any;
    return NextResponse.json({ 
      success: true, 
      data: {
        ...doorDataWithoutPassword,
        _id: doorDataWithoutPassword._id.toString()
      }
    });
  } catch (error) {
    console.error('Error saving door:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save door' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a door by _id
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { _id } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: '_id is required to delete a door.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    try {
      const result = await db.collection('doors').deleteOne({ _id: new ObjectId(_id) });
      
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Door not found.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Door deleted successfully' });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid _id format.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting door:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete door' },
      { status: 500 }
    );
  }
}
