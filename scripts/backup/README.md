# Backups (Postgres)

Scripts simples para backup/restore usando `DATABASE_URL`.

## Backup
- `export DATABASE_URL="postgres://..."`
- `./scripts/backup/pg_backup.sh`
- Ou: `./scripts/backup/pg_backup.sh my_backup.dump`

## Restore
- `export DATABASE_URL="postgres://..."`
- `./scripts/backup/pg_restore.sh my_backup.dump`

Notas:
- `pg_restore.sh` faz `--clean --if-exists` (destrutivo no destino).
- Recomendado correr em janela de manutenção.
