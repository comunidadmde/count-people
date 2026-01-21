import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export interface CounterData {
  doorId: string;
  auditorium?: string;
  timestamp: Date;
  ipAddress?: string;
  userName?: string;
}

// GET - Retrieve all counters with aggregated counts per door
export async function GET() {
  try {
    const db = await getDatabase();
    
    // Get all counter records
    const counters = await db
      .collection('counters')
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

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

    // Get all doors to map doorId to auditorium
    const doors = await db.collection('doors').find({}).toArray();
    const doorToAuditorium: Record<string, string> = {};
    doors.forEach((door: any) => {
      doorToAuditorium[door.doorId] = door.auditorium;
    });

    // Get aggregated counts per auditorium (sum across all doors)
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
            preserveNullAndEmptyArrays: false, // Only count doors that have an auditorium assigned
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

    // Create maps
    const countsMap: Record<string, number> = {};
    doorCounts.forEach((item) => {
      countsMap[item._id] = item.count;
    });

    // Create auditorium totals map
    const auditoriumTotalsMap: Record<string, number> = {};
    auditoriumTotals.forEach((item) => {
      auditoriumTotalsMap[item._id] = item.count;
    });

    return NextResponse.json({
      success: true,
      data: counters,
      doorCounts: countsMap,
      auditoriumTotals: auditoriumTotalsMap,
    });
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

// Helper function to get client IP address
function getClientIP(request: NextRequest): string {
  // Check various headers for IP address (handles proxies, load balancers, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  const remoteAddr = request.headers.get('x-remote-addr');
  
  // Log headers for debugging (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    console.log('IP Headers:', {
      'x-forwarded-for': forwarded,
      'x-real-ip': realIP,
      'cf-connecting-ip': cfConnectingIP,
      'x-remote-addr': remoteAddr,
    });
  }
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (remoteAddr) {
    return remoteAddr;
  }
  
  // Try to get from request URL (for development/localhost)
  const url = new URL(request.url);
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return '127.0.0.1';
  }
  
  // Fallback if no IP headers are available
  return 'unknown';
}

// POST - Save counter click (just a record, count is calculated from number of records)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doorId, userName, auditorium } = body;

    if (!doorId) {
      return NextResponse.json(
        { success: false, error: 'Invalid data. doorId is required.' },
        { status: 400 }
      );
    }

    // Get client IP address
    const ipAddress = getClientIP(request);
    console.log('Saving counter click with IP:', ipAddress);

    const db = await getDatabase();
    
    // Get door info to get auditorium
    const door = await db.collection('doors').findOne({ doorId });
    if (!door || !door.auditorium) {
      return NextResponse.json(
        { success: false, error: 'Door not found or auditorium not assigned. Please configure the door first.' },
        { status: 400 }
      );
    }

    const counterData: CounterData = {
      doorId,
      auditorium: door.auditorium, // Use auditorium from door configuration
      timestamp: new Date(),
      ipAddress,
      userName: userName || 'Anonymous',
    };

    const result = await db.collection('counters').insertOne(counterData);

    // Get the new count for this door
    const doorCount = await db.collection('counters').countDocuments({ doorId });

    return NextResponse.json({
      success: true,
      data: { ...counterData, _id: result.insertedId },
      count: doorCount,
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
