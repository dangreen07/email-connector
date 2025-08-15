import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import { config } from "dotenv";

config({ path: ".env.local" });

const db = drizzle(process.env.DATABASE_URL!, { schema });
export default db;