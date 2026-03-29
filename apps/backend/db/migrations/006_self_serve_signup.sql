BEGIN;

ALTER TABLE clients
ALTER COLUMN active_config_version_id DROP NOT NULL;

ALTER TABLE clients
ADD COLUMN is_system_client BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE clients
SET is_system_client = TRUE
WHERE name = 'demo';

COMMIT;
