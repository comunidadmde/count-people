import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { CounterData } from '../route';

// Helper function to get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  
  if (realIP) return realIP;
  if (cfConnectingIP) return cfConnectingIP;
  if (remoteAddr) return remoteAddr;
  
  const url = new URL(request.url);
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return '127.0.0.1';
  }
  
  return 'unknown';
}

// POST - Save multiple counter clicks in batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clicks } = body;

    if (!Array.isArray(clicks) || clicks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid data. clicks array is required.' },
        { status: 400 }
      );
    }

    // Get client IP address
    const ipAddress = getClientIP(request);

    const db = await getDatabase();
    
    // Get all doors to map doorId to auditorium
    const doors = await db.collection('doors').find({}).toArray();
    const doorToAuditorium: Record<string, string> = {};
    doors.forEach((door: any) => {
      doorToAuditorium[door.doorId] = door.auditorium;
    });

    // Prepare batch data - use auditorium from door configuration
    const batchData: CounterData[] = clicks.map((click) => {
      const auditorium = doorToAuditorium[click.doorId];
      if (!auditorium) {
        throw new Error(`Door ${click.doorId} not found or auditorium not assigned`);
      }
      return {
        doorId: click.doorId,
        auditorium: auditorium,
        timestamp: new Date(click.timestamp || Date.now()),
        ipAddress: click.ipAddress || ipAddress,
        userName: click.userName || 'Anonymous',
      };
    });

    // Insert all clicks in batch (ordered: false allows partial success)
    const result = await db.collection('counters').insertMany(batchData, {
      ordered: false, // Continue inserting even if some fail
    });

    // Get updated counts for all affected doors
    const doorIds = [...new Set(clicks.map((c: any) => c.doorId))];
    const doorCounts: Record<string, number> = {};
    
    for (const doorId of doorIds) {
      const count = await db.collection('counters').countDocuments({ doorId });
      doorCounts[doorId] = count;
    }

    // Check if all inserts succeeded
    const allInserted = result.insertedCount === batchData.length;

    return NextResponse.json({
      success: allInserted,
      insertedCount: result.insertedCount,
      expectedCount: batchData.length,
      doorCounts,
      ...(result.insertedIds && { insertedIds: Object.values(result.insertedIds) }),
    });
  } catch (error) {
    console.error('Error saving batch counters:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save batch counters',
        details: errorMessage.includes('MongoDB') || errorMessage.includes('Mongo')
          ? 'MongoDB connection error. Please check your MONGODB_URI in .env.local'
          : errorMessage
      },
      { status: 500 }
    );
  }
}
