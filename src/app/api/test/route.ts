// src/app/api/test/route.ts - Simple test endpoint
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    console.log('🧪 Test endpoint called');

    return NextResponse.json({
        success: true,
        message: 'API routing is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('🧪 Test POST endpoint called with body:', body);

        return NextResponse.json({
            success: true,
            message: 'POST endpoint is working!',
            receivedData: body,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test POST error:', error);
        return NextResponse.json(
            { error: 'Test POST failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}