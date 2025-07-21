// src/components/debug/EnvDebug.tsx
// TEMPORARY COMPONENT - Remove after debugging

'use client';

export function EnvDebug() {
    const envVars = {
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    return (
        <div className="fixed top-0 left-0 right-0 bg-red-100 border-b-2 border-red-300 p-4 z-50">
            <h3 className="font-bold text-red-800 mb-2">🔍 Environment Variables Debug</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {Object.entries(envVars).map(([key, value]) => (
                    <div key={key} className="flex">
                        <span className="font-mono font-bold min-w-[200px] text-red-700">{key}:</span>
                        <span className="font-mono ml-2">
                            {value ? (
                                <span className="text-green-700">✅ {value.substring(0, 20)}...</span>
                            ) : (
                                <span className="text-red-700">❌ MISSING</span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
            <p className="text-xs text-red-600 mt-2">
                Remove this component after debugging! Add &lt;EnvDebug /&gt; to any page to see env vars.
            </p>
        </div>
    );
}