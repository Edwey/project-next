import mysql from "mysql2/promise";

// Log database connection config (without password)
console.log('Database connection config:', {
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  database: process.env.DB_NAME ?? "university_management",
});

// Shared MySQL pool using environment variables that mirror project-SIMS config
const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASS ?? "",
  database: process.env.DB_NAME ?? "university_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // Add SSL support for TiDB Cloud
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: true
  } : undefined
});

// Test the connection on startup (only in development)
async function testConnection() {
  // Skip connection test during build process
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL === '1') {
    console.log('Skipping database connection test during Vercel build');
    return;
  }
  
  // Skip connection test if running in build process
  if (process.argv.some(arg => arg.includes('next build'))) {
    console.log('Skipping database connection test during build process');
    return;
  }
  
  try {
    const conn = await pool.getConnection();
    console.log('Successfully connected to the database');
    conn.release();
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  }
}

// Only test connection in development
if (process.env.NODE_ENV !== 'production') {
  testConnection();
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(sql, params);
    return rows as T[];
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "message" in error
        ? (error as Record<string, unknown>).message as string
        : String(error);
    console.error('Database query error:', { 
      error: message, 
      sql,
      params: params.map(p => typeof p === 'string' ? p.substring(0, 50) + (p.length > 50 ? '...' : '') : p)
    });
    
    // Return empty array for certain errors to prevent crashes during build
    if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      console.warn('Database connection failed, returning empty result');
      return [] as T[];
    }
    
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function getConnection() {
  return pool.getConnection();
}
