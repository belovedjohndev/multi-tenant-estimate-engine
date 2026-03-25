import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set before starting the backend');
}

const pool = new Pool({
    connectionString: databaseUrl,
    max: parseNumberFromEnv('PG_POOL_MAX', 10),
    idleTimeoutMillis: parseNumberFromEnv('PG_IDLE_TIMEOUT_MS', 30000),
    connectionTimeoutMillis: parseNumberFromEnv('PG_CONNECTION_TIMEOUT_MS', 5000),
    maxUses: parseNumberFromEnv('PG_MAX_USES', 7500),
    allowExitOnIdle: process.env.NODE_ENV !== 'production',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined
});

pool.on('error', (error) => {
    console.error('Unexpected idle PostgreSQL client error', error);
});

export async function verifyDatabaseConnection() {
    const client = await pool.connect();
    client.release();
}

export { pool };

function parseNumberFromEnv(name: string, fallback: number): number {
    const rawValue = process.env[name];

    if (!rawValue) {
        return fallback;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error(`${name} must be a positive integer when provided`);
    }

    return parsedValue;
}
