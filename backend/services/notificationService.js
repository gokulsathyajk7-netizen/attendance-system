import pool from '../config/db.js';
import logger from '../config/logger.js';

export const createNotification = async (userId, title, message, type = 'info', actionUrl = null, metaData = null) => {
  try {
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type, action_url, meta_data) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, message, type, actionUrl, metaData ? JSON.stringify(metaData) : null]
    );
  } catch (err) {
    logger.error('Notification create failed:', err.message);
  }
};

export const bulkNotify = async (userIds, title, message, type = 'info') => {
  if (!userIds.length) return;
  try {
    const placeholders = userIds.map(() => '(?, ?, ?, ?)').join(',');
    const values = userIds.flatMap((uid) => [uid, title, message, type]);
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ${placeholders}`,
      values
    );
  } catch (err) {
    logger.error('Bulk notification failed:', err.message);
  }
};

export const notifyAdmins = async (title, message, type = 'info') => {
  try {
    const [admins] = await pool.execute(
      `SELECT id FROM users WHERE role IN ('super_admin','admin') AND is_active = 1`
    );
    await bulkNotify(admins.map((a) => a.id), title, message, type);
  } catch (err) {
    logger.error('Notify admins failed:', err.message);
  }
};
