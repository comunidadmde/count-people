import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// POST - Verify door password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doorId, password } = body;

    if (!doorId || !password) {
      return NextResponse.json(
        { success: false, error: 'doorId and password are required.' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const door = await db.collection('doors').findOne({ doorId });

    if (!door) {
      return NextResponse.json(
        { success: false, error: 'Door not found.' },
        { status: 404 }
      );
    }

    if (door.password !== password.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid password.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying door password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify password' },
      { status: 500 }
    );
  }
}
