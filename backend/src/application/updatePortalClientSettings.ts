import { ClientSettings } from '../domain/clientSettings';
import { updateClientSettings } from '../infrastructure/clientRepository';

export interface UpdatePortalClientSettingsRequest extends Omit<ClientSettings, 'clientId'> {}

export async function updatePortalClientSettings(
    clientId: number,
    request: UpdatePortalClientSettingsRequest
): Promise<ClientSettings> {
    return updateClientSettings(clientId, request);
}
