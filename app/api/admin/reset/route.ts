import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/auth';

// POST - Reset all counters (only bulk reset allowed)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDatabase();

    // Reset all doors by deleting all records (empty filter deletes all documents)
    const result = await db.collection('counters').deleteMany({});

    return NextResponse.json({
      success: true,
      message: `All counters have been reset (${result.deletedCount} records deleted)`,
    });
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
