import mysql from "mysql2/promise";

// Create a database connection at runtime (not global pool)
// This ensures SSL is applied correctly in production environments like Vercel
export async function getDB() {
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    }
  };

  console.log('Database connection config:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    ssl: !!config.ssl
  });

  return mysql.createConnection(config);
}

// Test the connection on startup (only in development)
async function testConnection() {
  
  // Skip connection test if running in build process
  if (process.argv.some(arg => arg.includes('next build'))) {
    console.log('Skipping database connection test during build process');
    return;
  }
  
  try {
    const conn = await getDB();
    console.log('Successfully connected to the database');
    await conn.end();
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
    connection = await getDB();
    const [rows] = await connection.execute(sql, params);
    await connection.end();
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
  }
}

export async function getConnection() {
  return getDB();
}
