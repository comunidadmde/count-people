import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/auth';

// POST - Reset all counters (only bulk reset allowed)
// Saves current status to history collection before resetting
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

    // Get all doors
    const doors = await db.collection('doors').find({}).toArray();

    // Get aggregated counts per door
    const doorCounts = await db
      .collection('counters')
      .aggregate([
        {
          $group: {
            _id: '$doorId',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Get aggregated counts per auditorium
    const auditoriumTotals = await db
      .collection('counters')
      .aggregate([
        {
          $lookup: {
            from: 'doors',
            localField: 'doorId',
            foreignField: 'doorId',
            as: 'doorInfo',
          },
        },
        {
          $unwind: {
            path: '$doorInfo',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $group: {
            _id: '$doorInfo.auditorium',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Get total count of all records
    const totalRecords = await db.collection('counters').countDocuments({});

    // Get first and last count dates
    const firstCount = await db
      .collection('counters')
      .findOne({}, { sort: { timestamp: 1 } });
    
    const lastCount = await db
      .collection('counters')
      .findOne({}, { sort: { timestamp: -1 } });

    // Create maps for easier lookup
    const countsMap: Record<string, number> = {};
    doorCounts.forEach((item) => {
      countsMap[item._id] = item.count;
    });

    const auditoriumTotalsMap: Record<string, number> = {};
    auditoriumTotals.forEach((item) => {
      auditoriumTotalsMap[item._id] = item.count;
    });

    // Build history entry with all door statuses
    const historyEntry = {
      timestamp: new Date(),
      totalRecords,
      firstCountDate: firstCount?.timestamp || null,
      lastCountDate: lastCount?.timestamp || null,
      doors: doors.map((door: any) => ({
        doorId: door.doorId,
        doorName: door.doorName,
        auditorium: door.auditorium || 'Unassigned',
        count: countsMap[door.doorId] || 0,
      })),
      auditoriumTotals: auditoriumTotalsMap,
    };

    // Save to history collection
    await db.collection('history').insertOne(historyEntry);

    // Reset all doors by deleting all records (empty filter deletes all documents)
    const result = await db.collection('counters').deleteMany({});

    return NextResponse.json({
      success: true,
      message: `All counters have been reset (${result.deletedCount} records deleted). History saved.`,
      historySaved: true,
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
