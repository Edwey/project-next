import mysql from "mysql2/promise";

// Create a database connection at runtime (not global pool)
// This ensures SSL is applied correctly in production environments like Vercel
export async function getDB() {
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
  };

  console.log("SSL CHECK:", config.ssl);

  return mysql.createConnection(config);
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const connection = await getDB();
  const [rows] = await connection.execute(sql, params);
  await connection.end();
  return rows as T[];
}

export async function getConnection() {
  return getDB();
}
