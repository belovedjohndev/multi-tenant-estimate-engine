-- Adds editable company profile fields without changing the stable tenant slug used by the widget.

ALTER TABLE clients
ADD COLUMN company_name VARCHAR(255);

UPDATE clients
SET company_name = name
WHERE company_name IS NULL;

ALTER TABLE clients
ALTER COLUMN company_name SET NOT NULL;

ALTER TABLE clients
ADD COLUMN phone VARCHAR(32);
