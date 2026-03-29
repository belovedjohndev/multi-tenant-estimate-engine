-- Initial migration for estimator engine demo
-- Creates tables for multi-tenant support: clients, client_branding, client_config, leads

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE client_branding (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    logo_url VARCHAR(500),
    primary_color VARCHAR(7), -- hex color code
    secondary_color VARCHAR(7),
    font_family VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id)
);

CREATE TABLE client_config (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    estimator_config JSONB NOT NULL, -- configuration for estimator logic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id)
);

CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    estimate_data JSONB NOT NULL, -- the calculated estimate data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert demo tenant
INSERT INTO clients (name) VALUES ('demo');

-- Get the demo client id (assuming id=1)
INSERT INTO client_branding (client_id, logo_url, primary_color, secondary_color, font_family)
VALUES (1, 'https://example.com/logo.png', '#007bff', '#6c757d', 'Arial, sans-serif');

INSERT INTO client_config (client_id, estimator_config)
VALUES (1, '{
    "basePrice": 100,
    "multipliers": {
        "size": 1.5,
        "complexity": 2.0
    },
    "discounts": {
        "bulk": 0.1
    }
}');

-- Indexes for performance
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at);
