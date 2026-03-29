import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { AddressInfo } from 'node:net';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Server } from 'node:http';
import type { Client as PgClient } from 'pg';
import { IMemoryDb, newDb } from 'pg-mem';

interface SeededFixtures {
    demo: {
        clientId: number;
        clientSlug: string;
        email: string;
        password: string;
        activeConfigVersionId: number;
    };
    other: {
        clientId: number;
        clientSlug: string;
        email: string;
        password: string;
        activeConfigVersionId: number;
    };
}

interface JsonResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

const migrationsDirectory = path.resolve(__dirname, '..', '..', 'db', 'migrations');
const backendSourceRoot = path.resolve(__dirname, '..');
const portalOrigin = 'http://localhost:4174';
let memoryDatabase: IMemoryDb;
let server: Server;
let adminClient: PgClient;
let baseUrl = '';
let fixtures: SeededFixtures;
let createApp: typeof import('../index').createApp;
let testPool: typeof import('../infrastructure/database').pool;
let hashPasswordFn: typeof import('../infrastructure/authSecurity').hashPassword;

process.env.DATABASE_URL = 'postgresql://postgres@127.0.0.1:55432/postgres';
process.env.NODE_ENV = 'test';
process.env.WIDGET_ORIGIN = 'http://localhost:4173';
process.env.PORTAL_ORIGIN = portalOrigin;
process.env.CLIENT_PORTAL_COOKIE_SECURE = 'false';
process.env.CLIENT_PORTAL_COOKIE_SAME_SITE = 'lax';
process.env.CLIENT_PORTAL_DEMO_RESET_CLIENT_ID = 'demo';
process.env.CLIENT_PORTAL_DEMO_RESET_COMPANY_NAME = 'Demo Company';
process.env.CLIENT_PORTAL_DEMO_RESET_PHONE = '111-1111';
process.env.CLIENT_PORTAL_DEMO_RESET_NOTIFICATION_EMAIL = 'demo-notify@example.com';
process.env.CLIENT_PORTAL_DEMO_RESET_LOGO_URL = 'https://example.com/demo-logo.png';
process.env.CLIENT_PORTAL_DEMO_RESET_ESTIMATOR_CONFIG = JSON.stringify({
    basePrice: 100,
    multipliers: {
        size: 1.5,
        complexity: 2
    },
    discounts: {
        bulk: 0.1
    }
});

describe('critical backend flows', { concurrency: false }, () => {
    before(async () => undefined);

    beforeEach(async () => {
        memoryDatabase = newDb({
            autoCreateForeignKeyIndices: true
        });
        installPgModuleMock(memoryDatabase);
        clearBackendRequireCache();
        ({ createApp } = require('../index'));
        ({ pool: testPool } = require('../infrastructure/database'));
        ({ hashPassword: hashPasswordFn } = require('../infrastructure/authSecurity'));

        const { Client } = memoryDatabase.adapters.createPg();
        adminClient = new Client();
        await adminClient.connect();

        await resetDatabase();
        fixtures = await seedFixtures();

        const app = createApp();
        server = await new Promise<Server>((resolve) => {
            const listeningServer = app.listen(0, () => resolve(listeningServer));
        });

        baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        await testPool.end();
        await adminClient.end();
    });

    after(async () => undefined);

    it('handles auth login, cookie-backed /auth/me, and logout', async () => {
        const client = new TestHttpClient(baseUrl);

        const loginResponse = await client.request<{
            expiresAt: string;
            user: { email: string };
            client: { name: string };
        }>('/auth/login', {
            method: 'POST',
            json: {
                clientId: fixtures.demo.clientSlug,
                email: fixtures.demo.email,
                password: fixtures.demo.password
            }
        });

        assert.equal(loginResponse.status, 201);
        assert.equal(loginResponse.body.success, true);
        assert.match(loginResponse.setCookie ?? '', /HttpOnly/i);
        assert.match(loginResponse.setCookie ?? '', /SameSite=Lax/i);
        assert.doesNotMatch(loginResponse.setCookie ?? '', /;\s*Secure/i);
        assert.ok(client.cookieHeader);

        const meResponse = await client.request<{
            user: { email: string };
            client: { name: string };
        }>('/auth/me');

        assert.equal(meResponse.status, 200);
        assert.equal(meResponse.body.data?.user.email, fixtures.demo.email);
        assert.equal(meResponse.body.data?.client.name, fixtures.demo.clientSlug);

        const logoutResponse = await client.request<{ loggedOut: true }>('/auth/logout', {
            method: 'POST'
        });

        assert.equal(logoutResponse.status, 200);
        assert.match(logoutResponse.setCookie ?? '', /Max-Age=0/i);

        const meAfterLogoutResponse = await client.request('/auth/me');
        assert.equal(meAfterLogoutResponse.status, 401);
    });

    it('signs up a tenant, creates bootstrap records, and authenticates immediately', async () => {
        const client = new TestHttpClient(baseUrl);

        const signupResponse = await client.request<{
            expiresAt: string;
            user: { id: number; email: string; fullName: string };
            client: { id: number; name: string };
        }>('/auth/signup', {
            method: 'POST',
            json: {
                clientId: 'acme-home',
                companyName: 'Acme Home Services',
                fullName: 'Jane Owner',
                email: 'OWNER@ACME.COM',
                password: 'change-me-123',
                phone: '333-3333'
            }
        });

        assert.equal(signupResponse.status, 201);
        assert.equal(signupResponse.body.success, true);
        assert.equal(signupResponse.body.data?.client.name, 'acme-home');
        assert.equal(signupResponse.body.data?.user.email, 'owner@acme.com');
        assert.match(signupResponse.setCookie ?? '', /HttpOnly/i);
        assert.ok(client.cookieHeader);

        const createdClient = await adminClient.query<{
            id: number;
            company_name: string;
            phone: string | null;
            notification_email: string | null;
            active_config_version_id: number | null;
            is_system_client: boolean;
        }>(
            `SELECT id, company_name, phone, notification_email, active_config_version_id, is_system_client
             FROM clients
             WHERE name = 'acme-home'`
        );

        assert.equal(createdClient.rows.length, 1);
        assert.equal(createdClient.rows[0].company_name, 'Acme Home Services');
        assert.equal(createdClient.rows[0].phone, '333-3333');
        assert.equal(createdClient.rows[0].notification_email, 'owner@acme.com');
        assert.notEqual(createdClient.rows[0].active_config_version_id, null);
        assert.equal(createdClient.rows[0].is_system_client, false);

        const createdUser = await adminClient.query<{
            email: string;
            full_name: string;
            is_active: boolean;
        }>(
            `SELECT email, full_name, is_active
             FROM client_users
             WHERE client_id = $1`,
            [createdClient.rows[0].id]
        );

        assert.equal(createdUser.rows.length, 1);
        assert.equal(createdUser.rows[0].email, 'owner@acme.com');
        assert.equal(createdUser.rows[0].full_name, 'Jane Owner');
        assert.equal(createdUser.rows[0].is_active, true);

        const createdBranding = await adminClient.query<{
            primary_color: string | null;
            secondary_color: string | null;
            font_family: string | null;
        }>(
            `SELECT primary_color, secondary_color, font_family
             FROM client_branding
             WHERE client_id = $1`,
            [createdClient.rows[0].id]
        );

        assert.equal(createdBranding.rows.length, 1);
        assert.equal(createdBranding.rows[0].primary_color, '#1d4ed8');
        assert.equal(createdBranding.rows[0].secondary_color, '#0f766e');
        assert.equal(createdBranding.rows[0].font_family, 'Avenir Next');

        const createdConfigVersion = await adminClient.query<{
            version_number: number;
            created_by_client_user_id: number | null;
            estimator_config: {
                basePrice: number;
                multipliers: { size: number; complexity: number };
                discounts: { bulk: number };
            };
        }>(
            `SELECT version_number, created_by_client_user_id, estimator_config
             FROM client_config_versions
             WHERE client_id = $1`,
            [createdClient.rows[0].id]
        );

        assert.equal(createdConfigVersion.rows.length, 1);
        assert.equal(createdConfigVersion.rows[0].version_number, 1);
        assert.deepEqual(createdConfigVersion.rows[0].estimator_config, {
            basePrice: 100,
            multipliers: {
                size: 1.5,
                complexity: 2
            },
            discounts: {
                bulk: 0.1
            }
        });

        const meResponse = await client.request<{
            user: { email: string; fullName: string };
            client: { name: string };
        }>('/auth/me');
        const settingsResponse = await client.request<{
            clientId: string;
            companyName: string;
            currentConfigVersion: { versionNumber: number };
        }>('/portal/client');
        const leadsResponse = await client.request<{
            summary: { totalLeadCount: number };
            leads: Array<unknown>;
        }>('/me/leads');

        assert.equal(meResponse.status, 200);
        assert.equal(meResponse.body.data?.client.name, 'acme-home');
        assert.equal(meResponse.body.data?.user.email, 'owner@acme.com');
        assert.equal(settingsResponse.status, 200);
        assert.equal(settingsResponse.body.data?.clientId, 'acme-home');
        assert.equal(settingsResponse.body.data?.companyName, 'Acme Home Services');
        assert.equal(settingsResponse.body.data?.currentConfigVersion.versionNumber, 1);
        assert.equal(leadsResponse.status, 200);
        assert.equal(leadsResponse.body.data?.summary.totalLeadCount, 0);
        assert.deepEqual(leadsResponse.body.data?.leads, []);
    });

    it('rejects duplicate client ids during signup', async () => {
        const client = new TestHttpClient(baseUrl);

        const firstSignupResponse = await client.request('/auth/signup', {
            method: 'POST',
            json: {
                clientId: 'duplicate-client',
                companyName: 'Duplicate Client',
                fullName: 'Owner One',
                email: 'owner1@example.com',
                password: 'change-me-123'
            }
        });

        assert.equal(firstSignupResponse.status, 201);

        const secondClient = new TestHttpClient(baseUrl);
        const secondSignupResponse = await secondClient.request('/auth/signup', {
            method: 'POST',
            json: {
                clientId: 'duplicate-client',
                companyName: 'Different Company',
                fullName: 'Owner Two',
                email: 'owner2@example.com',
                password: 'change-me-123'
            }
        });

        assert.equal(secondSignupResponse.status, 409);
        assert.equal(secondSignupResponse.body.error?.code, 'client_id_unavailable');
        assert.equal(secondClient.cookieHeader, null);
    });

    it('rejects reserved client ids during signup', async () => {
        const client = new TestHttpClient(baseUrl);

        const signupResponse = await client.request('/auth/signup', {
            method: 'POST',
            json: {
                clientId: 'demo',
                companyName: 'Reserved Demo',
                fullName: 'Demo Owner',
                email: 'reserved@example.com',
                password: 'change-me-123'
            }
        });

        assert.equal(signupResponse.status, 409);
        assert.equal(signupResponse.body.error?.code, 'reserved_client_id');
        assert.equal(client.cookieHeader, null);
    });

    it('rejects protected portal access without authentication', async () => {
        const client = new TestHttpClient(baseUrl);

        const settingsResponse = await client.request('/portal/client');
        const leadsResponse = await client.request('/me/leads');

        assert.equal(settingsResponse.status, 401);
        assert.equal(settingsResponse.body.error?.code, 'missing_session_cookie');
        assert.equal(leadsResponse.status, 401);
    });

    it('does not create a new config version when pricing JSON is unchanged', async () => {
        const client = new TestHttpClient(baseUrl);
        await loginAs(client, fixtures.demo);

        const beforeVersionCount = await getConfigVersionCount(fixtures.demo.clientId);
        const currentSettingsResponse = await client.request<{
            companyName: string;
            logoUrl?: string;
            phone?: string;
            notificationEmail?: string;
            estimatorConfig: Record<string, unknown>;
            currentConfigVersion: { id: number; versionNumber: number };
        }>('/portal/client');
        const currentSettings = currentSettingsResponse.body.data;

        assert.ok(currentSettings);

        const updateResponse = await client.request<{
            companyName: string;
            currentConfigVersion: { id: number; versionNumber: number };
        }>('/portal/client', {
            method: 'PUT',
            json: {
                companyName: 'Demo Company Renamed',
                logoUrl: currentSettings.logoUrl,
                phone: currentSettings.phone,
                notificationEmail: currentSettings.notificationEmail,
                estimatorConfig: currentSettings.estimatorConfig
            }
        });

        assert.equal(updateResponse.status, 200);
        assert.equal(updateResponse.body.data?.companyName, 'Demo Company Renamed');
        assert.equal(updateResponse.body.data?.currentConfigVersion.versionNumber, 1);

        const afterVersionCount = await getConfigVersionCount(fixtures.demo.clientId);
        const activeVersion = await getActiveConfigVersion(fixtures.demo.clientId);

        assert.equal(afterVersionCount, beforeVersionCount);
        assert.equal(activeVersion.versionNumber, 1);
    });

    it('creates a new active config version when pricing JSON changes', async () => {
        const client = new TestHttpClient(baseUrl);
        await loginAs(client, fixtures.demo);

        const beforeVersionCount = await getConfigVersionCount(fixtures.demo.clientId);
        const currentSettingsResponse = await client.request<{
            companyName: string;
            logoUrl?: string;
            phone?: string;
            notificationEmail?: string;
            estimatorConfig: {
                basePrice: number;
                multipliers: { size: number; complexity: number };
                discounts: { bulk: number };
            };
        }>('/portal/client');
        const currentSettings = currentSettingsResponse.body.data;

        assert.ok(currentSettings);

        const updateResponse = await client.request<{
            currentConfigVersion: { id: number; versionNumber: number };
            configHistory: Array<{ versionNumber: number; isActive: boolean }>;
        }>('/portal/client', {
            method: 'PUT',
            json: {
                companyName: currentSettings.companyName,
                logoUrl: currentSettings.logoUrl,
                phone: currentSettings.phone,
                notificationEmail: currentSettings.notificationEmail,
                estimatorConfig: {
                    ...currentSettings.estimatorConfig,
                    basePrice: currentSettings.estimatorConfig.basePrice + 25
                }
            }
        });

        assert.equal(updateResponse.status, 200);
        assert.equal(updateResponse.body.data?.currentConfigVersion.versionNumber, 2);
        assert.equal(updateResponse.body.data?.configHistory[0]?.versionNumber, 2);
        assert.equal(updateResponse.body.data?.configHistory[0]?.isActive, true);

        const afterVersionCount = await getConfigVersionCount(fixtures.demo.clientId);
        const activeVersion = await getActiveConfigVersion(fixtures.demo.clientId);

        assert.equal(afterVersionCount, beforeVersionCount + 1);
        assert.equal(activeVersion.versionNumber, 2);
    });

    it('stores config_version_id when creating a lead', async () => {
        const estimateInput = {
            size: 12,
            complexity: 'high' as const,
            bulk: true
        };
        const estimateResponse = await requestJson<{
            configVersion: { id: number; versionNumber: number };
            total: number;
            breakdown: {
                basePrice: number;
                sizeMultiplier: number;
                complexityMultiplier: number;
                discount: number;
            };
        }>('/estimate', {
            method: 'POST',
            json: {
                clientId: fixtures.demo.clientSlug,
                input: estimateInput
            }
        });

        assert.equal(estimateResponse.status, 200);
        assert.ok(estimateResponse.body.data);

        const leadResponse = await requestJson<{ id: number }>('/leads', {
            method: 'POST',
            json: {
                clientId: fixtures.demo.clientSlug,
                name: 'Lead Capture Example',
                email: 'lead@example.com',
                phone: '555-1234',
                estimateInput,
                estimateData: estimateResponse.body.data
            }
        });

        assert.equal(leadResponse.status, 201);

        const storedLead = await adminClient.query<{
            config_version_id: number;
            estimate_data: {
                configVersion: {
                    id: number;
                    versionNumber: number;
                };
            };
        }>(
            'SELECT config_version_id, estimate_data FROM leads WHERE id = $1',
            [leadResponse.body.data?.id]
        );

        assert.equal(storedLead.rows[0].config_version_id, estimateResponse.body.data?.configVersion.id);
        assert.equal(
            storedLead.rows[0].estimate_data.configVersion.versionNumber,
            estimateResponse.body.data?.configVersion.versionNumber
        );
    });

    it('preserves tenant isolation for leads and client settings', async () => {
        await insertLeadFixture({
            clientId: fixtures.demo.clientId,
            configVersionId: fixtures.demo.activeConfigVersionId,
            email: 'demo-lead@example.com'
        });
        await insertLeadFixture({
            clientId: fixtures.other.clientId,
            configVersionId: fixtures.other.activeConfigVersionId,
            email: 'other-lead@example.com'
        });

        const demoClient = new TestHttpClient(baseUrl);
        await loginAs(demoClient, fixtures.demo);

        const demoSettingsResponse = await demoClient.request<{ clientId: string; companyName: string }>('/portal/client');
        const demoLeadsResponse = await demoClient.request<{ leads: Array<{ email: string }> }>('/me/leads');

        assert.equal(demoSettingsResponse.status, 200);
        assert.equal(demoSettingsResponse.body.data?.clientId, fixtures.demo.clientSlug);
        assert.equal(demoSettingsResponse.body.data?.companyName, 'Demo Company');
        assert.deepEqual(
            demoLeadsResponse.body.data?.leads.map((lead) => lead.email),
            ['demo-lead@example.com']
        );

        const otherClient = new TestHttpClient(baseUrl);
        await loginAs(otherClient, fixtures.other);

        const otherSettingsResponse = await otherClient.request<{ clientId: string; companyName: string }>('/portal/client');
        const otherLeadsResponse = await otherClient.request<{ leads: Array<{ email: string }> }>('/me/leads');

        assert.equal(otherSettingsResponse.status, 200);
        assert.equal(otherSettingsResponse.body.data?.clientId, fixtures.other.clientSlug);
        assert.equal(otherSettingsResponse.body.data?.companyName, 'Other Company');
        assert.deepEqual(
            otherLeadsResponse.body.data?.leads.map((lead) => lead.email),
            ['other-lead@example.com']
        );
    });

    it('resets the demo tenant back to the default portal state', async () => {
        const client = new TestHttpClient(baseUrl);
        await loginAs(client, fixtures.demo);

        const updateResponse = await client.request<{
            currentConfigVersion: { id: number; versionNumber: number };
        }>('/portal/client', {
            method: 'PUT',
            json: {
                companyName: 'Temporary Demo Name',
                logoUrl: 'https://example.com/temporary-demo-logo.png',
                phone: '999-9999',
                notificationEmail: 'temporary@example.com',
                estimatorConfig: {
                    basePrice: 175,
                    multipliers: {
                        size: 1.75,
                        complexity: 2.25
                    },
                    discounts: {
                        bulk: 0.2
                    }
                }
            }
        });

        assert.equal(updateResponse.status, 200);
        assert.equal(updateResponse.body.data?.currentConfigVersion.versionNumber, 2);

        const activeVersion = await getActiveConfigVersion(fixtures.demo.clientId);
        await insertLeadFixture({
            clientId: fixtures.demo.clientId,
            configVersionId: activeVersion.id,
            email: 'reset-me@example.com'
        });

        const resetResponse = await client.request<{
            reset: true;
            clientId: string;
            clearedLeadCount: number;
            removedConfigVersionCount: number;
        }>('/portal/demo/reset', {
            method: 'POST'
        });

        assert.equal(resetResponse.status, 200);
        assert.equal(resetResponse.body.data?.reset, true);
        assert.equal(resetResponse.body.data?.clientId, fixtures.demo.clientSlug);
        assert.equal(resetResponse.body.data?.clearedLeadCount, 1);
        assert.equal(resetResponse.body.data?.removedConfigVersionCount, 1);

        const settingsResponse = await client.request<{
            companyName: string;
            logoUrl?: string;
            phone?: string;
            notificationEmail?: string;
            currentConfigVersion: { versionNumber: number };
            configHistory: Array<{ versionNumber: number; isActive: boolean }>;
            estimatorConfig: {
                basePrice: number;
                multipliers: { size: number; complexity: number };
                discounts: { bulk: number };
            };
        }>('/portal/client');
        const leadsResponse = await client.request<{
            leads: Array<{ email: string }>;
            summary: { totalLeadCount: number };
        }>('/me/leads');

        assert.equal(settingsResponse.status, 200);
        assert.equal(settingsResponse.body.data?.companyName, 'Demo Company');
        assert.equal(settingsResponse.body.data?.logoUrl, 'https://example.com/demo-logo.png');
        assert.equal(settingsResponse.body.data?.phone, '111-1111');
        assert.equal(settingsResponse.body.data?.notificationEmail, 'demo-notify@example.com');
        assert.equal(settingsResponse.body.data?.currentConfigVersion.versionNumber, 1);
        assert.equal(settingsResponse.body.data?.configHistory.length, 1);
        assert.equal(settingsResponse.body.data?.configHistory[0]?.versionNumber, 1);
        assert.equal(settingsResponse.body.data?.configHistory[0]?.isActive, true);
        assert.deepEqual(settingsResponse.body.data?.estimatorConfig, {
            basePrice: 100,
            multipliers: {
                size: 1.5,
                complexity: 2
            },
            discounts: {
                bulk: 0.1
            }
        });

        assert.equal(leadsResponse.status, 200);
        assert.equal(leadsResponse.body.data?.summary.totalLeadCount, 0);
        assert.deepEqual(leadsResponse.body.data?.leads, []);
    });

    it('rejects demo reset for non-demo tenants', async () => {
        const client = new TestHttpClient(baseUrl);
        await loginAs(client, fixtures.other);

        const resetResponse = await client.request('/portal/demo/reset', {
            method: 'POST'
        });

        assert.equal(resetResponse.status, 403);
        assert.equal(resetResponse.body.error?.code, 'demo_reset_unavailable');
    });
});

class TestHttpClient {
    cookieHeader: string | null = null;

    constructor(private readonly serviceBaseUrl: string) {}

    async request<T>(
        routePath: string,
        options?: {
            method?: 'GET' | 'POST' | 'PUT';
            json?: unknown;
        }
    ): Promise<{
        status: number;
        body: JsonResponse<T>;
        setCookie: string | null;
    }> {
        const response = await fetch(`${this.serviceBaseUrl}${routePath}`, {
            method: options?.method ?? 'GET',
            headers: buildHeaders({
                cookieHeader: this.cookieHeader,
                includeJsonContentType: options?.json !== undefined
            }),
            body: options?.json !== undefined ? JSON.stringify(options.json) : undefined
        });

        const setCookie = response.headers.get('set-cookie');

        if (setCookie) {
            this.cookieHeader = setCookie.split(';', 1)[0];
        }

        return {
            status: response.status,
            body: (await response.json()) as JsonResponse<T>,
            setCookie
        };
    }
}

function installPgModuleMock(db: IMemoryDb): void {
    const pgModulePath = require.resolve('pg');
    const moduleRecord = require.cache[pgModulePath];
    const { Pool, Client } = db.adapters.createPg();

    require.cache[pgModulePath] = {
        id: pgModulePath,
        filename: pgModulePath,
        loaded: true,
        exports: {
            Pool,
            Client
        },
        children: moduleRecord?.children ?? [],
        path: path.dirname(pgModulePath),
        paths: moduleRecord?.paths ?? []
    } as NodeModule;
}

function clearBackendRequireCache(): void {
    for (const modulePath of Object.keys(require.cache)) {
        if (!modulePath.startsWith(backendSourceRoot)) {
            continue;
        }

        if (modulePath.includes(`${path.sep}test${path.sep}`)) {
            continue;
        }

        delete require.cache[modulePath];
    }
}

async function requestJson<T>(
    routePath: string,
    options?: {
        method?: 'GET' | 'POST' | 'PUT';
        json?: unknown;
    }
): Promise<{
    status: number;
    body: JsonResponse<T>;
}> {
    const response = await fetch(`${baseUrl}${routePath}`, {
        method: options?.method ?? 'GET',
        headers: buildHeaders({
            includeJsonContentType: options?.json !== undefined
        }),
        body: options?.json !== undefined ? JSON.stringify(options.json) : undefined
    });

    return {
        status: response.status,
        body: (await response.json()) as JsonResponse<T>
    };
}

function buildHeaders(options: {
    cookieHeader?: string | null;
    includeJsonContentType?: boolean;
}): Headers {
    const headers = new Headers({
        Origin: portalOrigin
    });

    if (options.includeJsonContentType) {
        headers.set('Content-Type', 'application/json');
    }

    if (options.cookieHeader) {
        headers.set('Cookie', options.cookieHeader);
    }

    return headers;
}

async function loginAs(client: TestHttpClient, fixture: SeededFixtures['demo'] | SeededFixtures['other']): Promise<void> {
    const loginResponse = await client.request('/auth/login', {
        method: 'POST',
        json: {
            clientId: fixture.clientSlug,
            email: fixture.email,
            password: fixture.password
        }
    });

    assert.equal(loginResponse.status, 201);
    assert.ok(client.cookieHeader);
}

async function resetDatabase(): Promise<void> {
    const migrationFiles = (await fs.readdir(migrationsDirectory))
        .filter((fileName) => fileName.endsWith('.sql'))
        .sort((left, right) => left.localeCompare(right));

    for (const migrationFile of migrationFiles) {
        const sql = normalizeMigrationSql(
            await fs.readFile(path.join(migrationsDirectory, migrationFile), 'utf8')
        );
        await adminClient.query(sql);
    }

    await adminClient.query('CREATE UNIQUE INDEX client_branding_client_id_unique_idx ON client_branding(client_id)');
    await adminClient.query('ALTER TABLE clients DROP CONSTRAINT clients_active_config_version_id_fkey');
    await adminClient.query('ALTER TABLE clients ALTER COLUMN active_config_version_id DROP NOT NULL');
}

async function seedFixtures(): Promise<SeededFixtures> {
    const demoPassword = 'demo-password-123';
    const otherPassword = 'other-password-123';
    const demoClientRow = await adminClient.query<{
        id: number;
        active_config_version_id: number;
    }>("SELECT id, active_config_version_id FROM clients WHERE name = 'demo'");
    const demoClientId = demoClientRow.rows[0].id;

    await adminClient.query(
        `UPDATE clients
         SET company_name = $1, phone = $2, notification_email = $3
         WHERE id = $4`,
        ['Demo Company', '111-1111', 'demo-notify@example.com', demoClientId]
    );

    await adminClient.query(
        `UPDATE client_branding
         SET logo_url = $1, primary_color = $2, secondary_color = $3, font_family = $4
         WHERE client_id = $5`,
        ['https://example.com/demo-logo.png', '#1d4ed8', '#0f766e', 'Avenir Next', demoClientId]
    );

    await createPortalUser(demoClientId, 'owner@demo.test', 'Demo Owner', demoPassword);
    const otherClient = await createClientWithActiveVersion({
        slug: 'other',
        companyName: 'Other Company',
        phone: '222-2222',
        notificationEmail: 'other-notify@example.com',
        estimatorConfig: {
            basePrice: 240,
            multipliers: {
                size: 1.2,
                complexity: 1.8
            },
            discounts: {
                bulk: 0.05
            }
        }
    });

    await createPortalUser(otherClient.clientId, 'owner@other.test', 'Other Owner', otherPassword);

    return {
        demo: {
            clientId: demoClientId,
            clientSlug: 'demo',
            email: 'owner@demo.test',
            password: demoPassword,
            activeConfigVersionId: demoClientRow.rows[0].active_config_version_id
        },
        other: {
            clientId: otherClient.clientId,
            clientSlug: 'other',
            email: 'owner@other.test',
            password: otherPassword,
            activeConfigVersionId: otherClient.activeConfigVersionId
        }
    };
}

async function createPortalUser(clientId: number, email: string, fullName: string, password: string): Promise<void> {
    const passwordHash = await hashPasswordFn(password);

    await adminClient.query(
        `INSERT INTO client_users (client_id, email, full_name, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [clientId, email, fullName, passwordHash]
    );
}

async function createClientWithActiveVersion(input: {
    slug: string;
    companyName: string;
    phone: string;
    notificationEmail: string;
    estimatorConfig: Record<string, unknown>;
}): Promise<{ clientId: number; activeConfigVersionId: number }> {
    await adminClient.query('BEGIN');

    try {
        const insertedClient = await adminClient.query<{ id: number }>(
            `INSERT INTO clients (name, company_name, phone, notification_email, active_config_version_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [input.slug, input.companyName, input.phone, input.notificationEmail, null]
        );
        const clientId = insertedClient.rows[0].id;
        const insertedVersion = await adminClient.query<{ id: number }>(
            `INSERT INTO client_config_versions (client_id, version_number, estimator_config)
             VALUES ($1, 1, $2)
             RETURNING id`,
            [clientId, input.estimatorConfig]
        );
        const configVersionId = insertedVersion.rows[0].id;

        await adminClient.query('UPDATE clients SET active_config_version_id = $1 WHERE id = $2', [
            configVersionId,
            clientId
        ]);
        await adminClient.query(
            `INSERT INTO client_branding (client_id, logo_url, primary_color, secondary_color, font_family)
             VALUES ($1, $2, $3, $4, $5)`,
            [clientId, `https://example.com/${input.slug}.png`, '#c2410c', '#0f766e', 'Avenir Next']
        );
        await adminClient.query(
            `INSERT INTO audit_logs (client_id, action, entity_type, entity_id, metadata)
             VALUES ($1, $2, $3, $4, $5), ($1, $6, $3, $4, $7)`,
            [
                clientId,
                'config_version_created',
                'client_config_version',
                configVersionId,
                {
                    versionNumber: 1,
                    source: 'test_seed'
                },
                'config_version_activated',
                {
                    versionNumber: 1,
                    source: 'test_seed',
                    previousActiveConfigVersionId: null,
                    newActiveConfigVersionId: configVersionId
                }
            ]
        );

        await adminClient.query('COMMIT');

        return {
            clientId,
            activeConfigVersionId: configVersionId
        };
    } catch (error) {
        await adminClient.query('ROLLBACK');
        throw error;
    }
}

async function getConfigVersionCount(clientId: number): Promise<number> {
    const result = await adminClient.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM client_config_versions WHERE client_id = $1',
        [clientId]
    );

    return Number.parseInt(result.rows[0].count, 10);
}

async function getActiveConfigVersion(clientId: number): Promise<{ id: number; versionNumber: number }> {
    const result = await adminClient.query<{
        id: number;
        version_number: number;
    }>(
        `SELECT client_config_versions.id, client_config_versions.version_number
         FROM clients
         JOIN client_config_versions ON client_config_versions.id = clients.active_config_version_id
         WHERE clients.id = $1`,
        [clientId]
    );

    return {
        id: result.rows[0].id,
        versionNumber: result.rows[0].version_number
    };
}

async function insertLeadFixture(input: {
    clientId: number;
    configVersionId: number;
    email: string;
}): Promise<void> {
    await adminClient.query(
        `INSERT INTO leads (client_id, config_version_id, name, email, phone, estimate_input, estimate_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            input.clientId,
            input.configVersionId,
            'Fixture Lead',
            input.email,
            '555-0000',
            {
                size: 5,
                complexity: 'medium',
                bulk: false
            },
            {
                total: 150,
                breakdown: {
                    basePrice: 100,
                    sizeMultiplier: 1.5,
                    complexityMultiplier: 1,
                    discount: 0
                },
                configVersion: {
                    id: input.configVersionId,
                    versionNumber: 1
                }
            }
        ]
    );
}

function normalizeMigrationSql(sql: string): string {
    return sql
        .replace(
            /ALTER TABLE clients\s+ADD CONSTRAINT clients_notification_email_format_chk\s+CHECK\s*\(\s*notification_email IS NULL\s+OR notification_email ~\* '[^']+'\s*\);\s*/im,
            ''
        )
        .replace(
            /ALTER TABLE leads\s+ADD CONSTRAINT leads_estimate_input_is_object_chk\s+CHECK\s*\(\s*estimate_input IS NULL\s+OR jsonb_typeof\(estimate_input\) = 'object'\s*\);\s*/im,
            ''
        )
        .replace(
            /INSERT INTO audit_logs\s*\(client_id,\s*action,\s*entity_type,\s*entity_id,\s*metadata,\s*created_at\)\s*SELECT[\s\S]*?FROM client_config_versions;\s*/im,
            ''
        )
        .replace(
            /INSERT INTO audit_logs\s*\(client_id,\s*action,\s*entity_type,\s*entity_id,\s*metadata,\s*created_at\)\s*SELECT[\s\S]*?FROM clients c\s*JOIN client_config_versions ON client_config_versions\.id = c\.active_config_version_id;\s*/im,
            ''
        );
}
