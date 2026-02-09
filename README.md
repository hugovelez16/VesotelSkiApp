# Ski Vesotel - Plataforma de Gestion para Escuelas de Esqui

**Ski Vesotel** es una plataforma de gestión integral diseñada para escuelas de esquí. Optimiza las operaciones permitiendo a los instructores registrar sus horas (clases particulares, cursillos) y facilitando a la administración la gestión de nóminas, tarifas y roles de usuario.

![Banner Ski Vesotel](https://via.placeholder.com/1200x500?text=Ski+Vesotel+Platform)

## Caracteristicas

*   **Portal del Instructor**: Registro de horas de trabajo para clases particulares y cursos de varios días.
*   **Panel de Administracion**: Gestion de usuarios, empresas y generación de nóminas.
*   **Precios Dinamicos**: Cálculo automático de importes brutos/netos basado en tarifas específicas de la empresa y deducciones de seguridad social.
*   **Acceso Basado en Roles**: Permisos granulares para Administradores, Gerentes y Trabajadores.
*   **Interfaz Moderna**: Construida con Next.js 14 y Tailwind CSS para una experiencia adaptable a dispositivos móviles.

## Tecnologias

Este proyecto sigue una arquitectura de microservicios proporcionada por Docker:

*   **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), Tailwind CSS.
*   **Backend**: [FastAPI](https://fastapi.tiangolo.com/) (Python), SQLAlchemy.
*   **Base de Datos**: [PostgreSQL 16](https://www.postgresql.org/).
*   **Proxy Inverso**: Caddy (gestionado externamente vía Plesk/Docker).

## Arquitectura

El sistema se compone de los siguientes contenedores Docker:

| Servicio | Nombre del Contenedor | Puerto | Descripcion |
| :--- | :--- | :--- | :--- |
| **Frontend** | `vesotel_frontend_container` | `3000` | Aplicación Next.js (Build de Producción). |
| **Backend** | `vesotel_backend_container` | `8000` | Aplicación FastAPI. |
| **Base de Datos** | `vesotel_postgres_container` | `5432` | Base de datos PostgreSQL. |

## Guia de Inicio

### Requisitos Previos

*   [Docker](https://docs.docker.com/get-docker/) instalado.
*   [Docker Compose](https://docs.docker.com/compose/install/) instalado.
*   Git.

### Instalacion

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/hugovelez16/VesotelSkiApp.git
    cd VesotelSkiApp
    ```

2.  **Configuracion del Entorno**:
    Crea un archivo `.env` en el directorio raíz basado en `.env.example`.
    ```bash
    cp .env.example .env
    ```
    *Edita `.env` y rellena tus credenciales de base de datos y claves secretas.*

3.  **Iniciar la Aplicacion**:
    ```bash
    docker compose up -d --build
    ```

4.  **Acceder a la App**:
    *   Frontend: `http://localhost:3000`
    *   Documentación API Backend: `http://localhost:8000/docs`

## Configuracion

### Variables de Entorno

Asegúrate de que tu archivo `.env` contenga las siguientes variables críticas:

```env
# Base de Datos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_contraseña_segura
POSTGRES_DB=vesotel_db

# Backend
SECRET_KEY=tu_clave_secreta_generada
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
