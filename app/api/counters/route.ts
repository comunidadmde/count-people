import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export interface CounterData {
  doorId: string;
  count: number;
  timestamp: Date;
  ipAddress?: string;
  userName?: string;
}

// GET - Retrieve all counters
export async function GET() {
  try {
    const db = await getDatabase();
    const counters = await db
      .collection('counters')
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: counters });
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

// POST - Save counter data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doorId, count, userName } = body;

    if (!doorId || typeof count !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid data. doorId and count are required.' },
        { status: 400 }
      );
    }

    // Get client IP address
    const ipAddress = getClientIP(request);
    console.log('Saving counter with IP:', ipAddress);

    const db = await getDatabase();
    const counterData: CounterData = {
      doorId,
      count,
      timestamp: new Date(),
      ipAddress,
      userName: userName || 'Anonymous',
    };

    const result = await db.collection('counters').insertOne(counterData);

    return NextResponse.json({
      success: true,
      data: { ...counterData, _id: result.insertedId },
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
