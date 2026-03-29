-- Adds tenant-level lead notification routing and stores estimate inputs for future lead notifications.

ALTER TABLE clients
ADD COLUMN notification_email VARCHAR(255);

ALTER TABLE clients
ADD CONSTRAINT clients_notification_email_format_chk
CHECK (
    notification_email IS NULL
    OR notification_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
);

ALTER TABLE leads
ADD COLUMN estimate_input JSONB;

ALTER TABLE leads
ADD CONSTRAINT leads_estimate_input_is_object_chk
CHECK (
    estimate_input IS NULL
    OR jsonb_typeof(estimate_input) = 'object'
);
