import { neon } from '@neondatabase/serverless';

// Use Neon's serverless driver for edge/serverless environments
const sql = neon(process.env.DATABASE_URL!);

export { sql };

// Helper to generate short IDs
export function generateId(prefix: string = ''): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = prefix;
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
