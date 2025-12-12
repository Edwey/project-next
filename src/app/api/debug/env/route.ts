import { NextResponse } from "next/server";

export async function GET() {
  // Only allow in development or with a special query parameter for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: "Debug endpoint not available in production",
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      // Check if env vars exist (without revealing values)
      hasDbHost: !!process.env.DB_HOST,
      hasDbUser: !!process.env.DB_USER, 
      hasDbName: !!process.env.DB_NAME,
      hasDbPort: !!process.env.DB_PORT,
      hasDbPass: !!process.env.DB_PASS,
    });
  }

  // Development mode - show more info
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    dbConfig: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      name: process.env.DB_NAME,
      port: process.env.DB_PORT,
      hasPass: !!process.env.DB_PASS,
    }
  });
}
