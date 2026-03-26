import { hashPassword } from '../infrastructure/authSecurity';
import { findClientByName } from '../infrastructure/clientRepository';
import { createOrUpdateClientUser } from '../infrastructure/clientUserRepository';

async function main() {
    const clientId = readRequiredEnv('CLIENT_ID');
    const email = readRequiredEnv('CLIENT_USER_EMAIL').toLowerCase();
    const fullName = readRequiredEnv('CLIENT_USER_FULL_NAME');
    const password = readRequiredEnv('CLIENT_USER_PASSWORD');

    if (password.length < 8) {
        throw new Error('CLIENT_USER_PASSWORD must be at least 8 characters');
    }

    const client = await findClientByName(clientId);

    if (!client) {
        throw new Error(`Client "${clientId}" was not found`);
    }

    const user = await createOrUpdateClientUser({
        clientId: client.id,
        email,
        fullName,
        passwordHash: await hashPassword(password)
    });

    console.log(
        `Client portal user ready: client=${client.name} email=${user.email} fullName="${user.fullName}" userId=${user.id}`
    );
}

main()
    .catch((error) => {
        console.error('Failed to create client portal user', error);
        process.exit(1);
    });

function readRequiredEnv(name: string): string {
    const value = process.env[name];

    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${name} must be set`);
    }

    return value.trim();
}
