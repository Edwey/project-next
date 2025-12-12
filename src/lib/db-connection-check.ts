import mysql from "mysql2/promise";

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Check if required environment variables are set
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing database environment variables:', missingVars);
      return false;
    }

    // Create a test connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST!,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER!,
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME!,
      connectTimeout: 10000,
    });

    // Test a simple query
    await connection.execute('SELECT 1');
    await connection.end();
    
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
