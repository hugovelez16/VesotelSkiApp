---
description: Reiniciar todos los servicios Docker
---

# Reiniciar Servicios Docker

Este workflow reinicia todos los contenedores del proyecto de forma ordenada.

// turbo
1. Detener todos los contenedores
```bash
docker-compose down
```

// turbo
2. Iniciar todos los contenedores
```bash
docker-compose up -d
```

// turbo
3. Verificar el estado de los contenedores
```bash
docker-compose ps
```

4. Verificar logs si hay algún problema
```bash
docker-compose logs --tail=50
```
