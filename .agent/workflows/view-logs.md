---
description: Ver logs de los contenedores Docker
---

# Ver Logs de Contenedores

Este workflow te ayuda a revisar los logs de los diferentes servicios.

1. Ver logs del backend (últimas 50 líneas)
```bash
docker logs vesotel_backend_container --tail=50 -f
```

2. Ver logs del frontend (últimas 50 líneas)
```bash
docker logs vesotel_frontend_container --tail=50 -f
```

3. Ver logs de PostgreSQL (últimas 50 líneas)
```bash
docker logs vesotel_postgres_container --tail=50 -f
```

4. Ver logs de todos los servicios en tiempo real
```bash
docker-compose logs -f
```

**Nota:** Usa `Ctrl+C` para salir del modo follow (-f)
