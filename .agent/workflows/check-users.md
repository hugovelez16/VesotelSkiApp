---
description: Ver lista de usuarios y sus atributos
---

# Consultar Usuarios de la Base de Datos

Este workflow muestra información detallada sobre los usuarios del sistema.

// turbo
1. Listar todos los usuarios con información básica
```bash
docker exec vesotel_postgres_container psql -U postgres -d postgres -c "SELECT id, email, first_name, last_name, role, is_active, is_active_worker, created_at FROM users ORDER BY created_at;"
```

2. Contar usuarios por rol
```bash
docker exec vesotel_postgres_container psql -U postgres -d postgres -c "SELECT role, COUNT(*) as total FROM users GROUP BY role;"
```

3. Ver usuarios activos vs inactivos
```bash
docker exec vesotel_postgres_container psql -U postgres -d postgres -c "SELECT is_active, COUNT(*) as total FROM users GROUP BY is_active;"
```

4. Ver estructura completa de la tabla users
```bash
docker exec vesotel_postgres_container psql -U postgres -d postgres -c "\d users"
```
