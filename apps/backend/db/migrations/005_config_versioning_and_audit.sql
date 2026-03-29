-- Adds immutable estimator config versions, lead-to-config linkage, and audit logs.

BEGIN;

CREATE TABLE client_config_versions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    estimator_config JSONB NOT NULL,
    created_by_client_user_id INTEGER REFERENCES client_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (client_id, version_number)
);

ALTER TABLE clients
ADD COLUMN active_config_version_id INTEGER;

INSERT INTO client_config_versions (client_id, version_number, estimator_config, created_at)
SELECT client_id, 1, estimator_config, created_at
FROM client_config;

UPDATE clients
SET active_config_version_id = client_config_versions.id
FROM client_config_versions
WHERE client_config_versions.client_id = clients.id
  AND client_config_versions.version_number = 1;

ALTER TABLE clients
ALTER COLUMN active_config_version_id SET NOT NULL;

ALTER TABLE clients
ADD CONSTRAINT clients_active_config_version_id_fkey
FOREIGN KEY (active_config_version_id) REFERENCES client_config_versions(id);

ALTER TABLE leads
ADD COLUMN config_version_id INTEGER;

UPDATE leads
SET config_version_id = clients.active_config_version_id
FROM clients
WHERE clients.id = leads.client_id;

ALTER TABLE leads
ALTER COLUMN config_version_id SET NOT NULL;

ALTER TABLE leads
ADD CONSTRAINT leads_config_version_id_fkey
FOREIGN KEY (config_version_id) REFERENCES client_config_versions(id);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    actor_client_user_id INTEGER REFERENCES client_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO audit_logs (client_id, action, entity_type, entity_id, metadata, created_at)
SELECT
    client_id,
    'config_version_created',
    'client_config_version',
    id,
    jsonb_build_object('versionNumber', version_number, 'source', 'migration_backfill'),
    created_at
FROM client_config_versions;

INSERT INTO audit_logs (client_id, action, entity_type, entity_id, metadata, created_at)
SELECT
    c.id,
    'config_version_activated',
    'client_config_version',
    c.active_config_version_id,
    jsonb_build_object(
        'versionNumber',
        client_config_versions.version_number,
        'previousActiveConfigVersionId',
        NULL,
        'newActiveConfigVersionId',
        c.active_config_version_id,
        'source',
        'migration_backfill'
    ),
    client_config_versions.created_at
FROM clients c
JOIN client_config_versions ON client_config_versions.id = c.active_config_version_id;

CREATE INDEX idx_client_config_versions_client_id ON client_config_versions(client_id);
CREATE INDEX idx_client_config_versions_client_version ON client_config_versions(client_id, version_number DESC);
CREATE INDEX idx_leads_config_version_id ON leads(config_version_id);
CREATE INDEX idx_audit_logs_client_id ON audit_logs(client_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

COMMIT;
