import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
host: process.env.DB_HOST || 'localhost',
port: Number(process.env.DB_PORT) || 3306,
user: process.env.DB_USER || 'root',
password: process.env.DB_PASSWORD || '',
database: process.env.DB_NAME || 'attendance_db',

waitForConnections: true,
connectionLimit: 20,
queueLimit: 0,

enableKeepAlive: true,
keepAliveInitialDelay: 0,

dateStrings: true,
timezone: '+05:30',
});

export const connectDB = async () => {
try {
const connection = await pool.getConnection();

console.log(
  `MySQL connected: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'attendance_db'}`
);

connection.release();

} catch (error) {
console.error('MySQL connection failed:', error.message);
process.exit(1);
}
};

export default pool;
