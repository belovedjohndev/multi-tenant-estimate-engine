# Estimate Engine — Multi-Tenant Lead & Estimate System

This project is a multi-tenant estimate and lead capture system designed for service businesses (HVAC, plumbing, roofing, etc.).

It includes:
- TypeScript backend (Express)
- PostgreSQL database
- Reusable embeddable widget
- Demo site
- Multi-tenant client configuration
- Deterministic estimate calculation
- Lead capture and storage

## Architecture

- Clean / layered architecture
- Domain models separated from database models
- Repository pattern for persistence
- Multi-tenant via client configuration
- Widget consumes backend API
- Demo site hosts the widget

## Project Structure
- backend/ → API + domain + database
- widget/ → embeddable estimate widget
- demo-site/ → public demo site hosting
- the widget


## Tech Stack

- TypeScript
- Node.js (Express)
- PostgreSQL
- Vite
- Docker (local database)

## Status

Local end-to-end flow complete:
- Estimate calculation
- Lead submission
- Multi-tenant config
- Widget integration
- Demo site integration

Next step: public deployment.