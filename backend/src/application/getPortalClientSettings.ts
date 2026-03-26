import { ClientSettings } from '../domain/clientSettings';
import { getClientSettings } from '../infrastructure/clientRepository';

export async function getPortalClientSettings(clientId: number): Promise<ClientSettings> {
    return getClientSettings(clientId);
}
