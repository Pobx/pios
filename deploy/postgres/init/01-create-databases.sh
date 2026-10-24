#!/bin/sh
# Creates the additional database for Keycloak (the app database is created by POSTGRES_DB).
# Runs only on first initialisation of the data volume. Use `docker compose down -v` to re-run.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<EOSQL
SELECT 'CREATE DATABASE "${KEYCLOAK_DB}"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${KEYCLOAK_DB}')\gexec
EOSQL
