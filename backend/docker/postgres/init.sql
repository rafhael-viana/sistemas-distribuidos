-- Cada serviço tem o próprio banco. Roda só na primeira vez que o volume
-- do Postgres é criado; as tabelas são criadas pelos serviços ao subir.
CREATE DATABASE auth;
CREATE DATABASE notification;
CREATE DATABASE audit;
CREATE DATABASE report;
