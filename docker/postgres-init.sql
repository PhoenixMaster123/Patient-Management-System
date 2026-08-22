-- Runs once, on first start of an empty postgres volume.
-- POSTGRES_DB already creates patient-service-db; auth-service keeps its own.
SELECT 'CREATE DATABASE "auth-service-db"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth-service-db')\gexec
