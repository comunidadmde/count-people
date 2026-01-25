import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/auth';

// GET - Get all history records
export async function GET() {
  try {
    // Check authentication
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    
    // Get all history records, sorted by timestamp descending (most recent first)
    const history = await db
      .collection('history')
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    // Convert _id to string for JSON serialization
    const historyWithStringId = history.map(entry => ({
      ...entry,
      _id: entry._id.toString(),
    }));

    return NextResponse.json({ success: true, data: historyWithStringId });
  } catch (error) {
    console.error('Error fetching history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch history',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
