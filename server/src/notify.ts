import { query, execute } from './db.js';
// Create in-app notification for all users
export async function notifyAllInApp(message: string, type: 'info' | 'warning' | 'success' = 'info'): Promise<void> {
  try {
    const users = await query<{ id: string }>('SELECT id FROM users');
    for (const user of users) {
      await execute(
        'INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)',
        [user.id, message, type]
      );
    }
  } catch (error) {
    console.error('notifyAllInApp error:', error);
  }
}
// Create in-app notification for specific users (e.g. linked parents)
export async function notifyUsersInApp(userIds: string[], message: string, type: 'info' | 'warning' | 'success' = 'info'): Promise<void> {
  try {
    for (const userId of userIds) {
      await execute(
        'INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)',
        [userId, message, type]
      );
    }
  } catch (error) {
    console.error('notifyUsersInApp error:', error);
  }
}
