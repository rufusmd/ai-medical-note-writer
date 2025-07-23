// src/app/api/debug/env/route.ts
// 🔍 DEBUG ENDPOINT: Check if environment variables are loaded on server-side
// ⚠️ REMOVE THIS FILE AFTER DEBUGGING!

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    const envCheck = {
        nodeEnv: process.env.NODE_ENV,
        hasGeminiKey: !!process.env.GOOGLE_GEMINI_API_KEY,
        hasClaudeKey: !!process.env.ANTHROPIC_API_KEY,
        hasFirebaseKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasFirebaseProject: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,

        // Show first few characters for verification (never show full keys!)
        geminiKeyPreview: process.env.GOOGLE_GEMINI_API_KEY ?
            `${process.env.GOOGLE_GEMINI_API_KEY.substring(0, 8)}...` : 'MISSING',
        claudeKeyPreview: process.env.ANTHROPIC_API_KEY ?
            `${process.env.ANTHROPIC_API_KEY.substring(0, 8)}...` : 'MISSING',

        aiProvider: process.env.NEXT_PUBLIC_AI_PROVIDER,
        enableFallback: process.env.NEXT_PUBLIC_ENABLE_PROVIDER_FALLBACK,

        // Check .env.local file location
        cwd: process.cwd(),
        envFiles: 'Check that .env.local is in project root',

        timestamp: new Date().toISOString()
    };

    return NextResponse.json({
        message: '🔍 Environment Variables Debug Check',
        warning: '⚠️ This endpoint should only be used for debugging and must be removed from production!',
        env: envCheck
    });
}