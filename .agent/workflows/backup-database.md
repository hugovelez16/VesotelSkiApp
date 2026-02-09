---
description: Crear backup completo de la base de datos PostgreSQL
---

# Backup de Base de Datos

Este workflow crea un backup completo de la base de datos PostgreSQL.

1. Crear backup con timestamp
```bash
docker exec vesotel_postgres_container pg_dump -U postgres postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. Verificar que el backup se creó correctamente
```bash
ls -lh backup_*.sql | tail -5
```

3. (Opcional) Comprimir el backup para ahorrar espacio
```bash
gzip backup_*.sql
```

## Restaurar desde backup

Si necesitas restaurar, usa:
```bash
docker exec -i vesotel_postgres_container psql -U postgres postgres < backup_YYYYMMDD_HHMMSS.sql
```
