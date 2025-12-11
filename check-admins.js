const mysql = require('mysql2/promise');

async function checkAdmins() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "university_management",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const [rows] = await pool.execute(
      "SELECT id, username, email, password_hash, role, is_active, mfa_email_enabled FROM users WHERE username LIKE '%admin%' OR role = 'admin'"
    );

    console.log('Admin users found:');
    rows.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}, MFA: ${user.mfa_email_enabled}`);
      console.log('---');
    });

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdmins();