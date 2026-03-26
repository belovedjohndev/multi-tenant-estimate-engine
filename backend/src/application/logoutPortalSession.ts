import { hashSessionToken } from '../infrastructure/authSecurity';
import { revokeClientSessionByTokenHash } from '../infrastructure/clientUserRepository';

export async function logoutPortalSession(token: string): Promise<void> {
    await revokeClientSessionByTokenHash(hashSessionToken(token));
}
