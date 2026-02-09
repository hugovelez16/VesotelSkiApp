---
description: Reinicio completo del entorno de desarrollo
---

# Fresh Start - Reinicio Completo

Este workflow realiza un reinicio completo del entorno de desarrollo, útil cuando hay problemas persistentes.

⚠️ **ADVERTENCIA:** Este workflow eliminará contenedores y volúmenes. Asegúrate de tener backups.

1. Detener todos los contenedores
```bash
docker-compose down
```

2. Eliminar volúmenes de node_modules (opcional, solo si hay problemas)
```bash
docker volume prune -f
```

3. Limpiar cachés de Docker (opcional)
```bash
docker system prune -f
```

4. Reconstruir las imágenes desde cero
```bash
docker-compose build --no-cache
```

5. Iniciar todos los servicios
```bash
docker-compose up -d
```

6. Verificar que todo está funcionando
```bash
docker-compose ps
```

7. Ver logs para confirmar inicio exitoso
```bash
docker-compose logs --tail=100
```
