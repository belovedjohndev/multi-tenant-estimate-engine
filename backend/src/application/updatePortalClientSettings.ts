import { ClientSettings } from '../domain/clientSettings';
import { updateClientSettings } from '../infrastructure/clientRepository';

export interface UpdatePortalClientSettingsRequest
    extends Omit<ClientSettings, 'clientId' | 'currentConfigVersion' | 'configHistory'> {}

export async function updatePortalClientSettings(
    clientId: number,
    request: UpdatePortalClientSettingsRequest,
    actorClientUserId?: number
): Promise<ClientSettings> {
    return updateClientSettings(clientId, request, actorClientUserId);
}
