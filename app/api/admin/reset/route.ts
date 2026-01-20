import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/auth';

// POST - Reset a specific door counter or all counters
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { doorId } = body;

    const db = await getDatabase();

    if (doorId) {
      // Reset specific door by inserting a reset record with count 0
      const resetData = {
        doorId,
        count: 0,
        timestamp: new Date(),
        resetBy: 'admin',
      };

      await db.collection('counters').insertOne(resetData);

      return NextResponse.json({
        success: true,
        message: `Counter for door ${doorId} has been reset`,
      });
    } else {
      // Reset all doors
      const doors = ['door-1', 'door-2', 'door-3'];
      const resetPromises = doors.map((id) =>
        db.collection('counters').insertOne({
          doorId: id,
          count: 0,
          timestamp: new Date(),
          resetBy: 'admin',
        })
      );

      await Promise.all(resetPromises);

      return NextResponse.json({
        success: true,
        message: 'All counters have been reset',
      });
    }
  } catch (error) {
    console.error('Error resetting counters:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset counters',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
