# Ski Vesotel - Plataforma de Gestion para Escuelas de Esqui

**Ski Vesotel** es una plataforma de gestión integral diseñada para escuelas de esquí. Optimiza las operaciones permitiendo a los instructores registrar sus horas (clases particulares, cursillos) y facilitando a la administración la gestión de nóminas, tarifas y roles de usuario.

<img width="1919" height="963" alt="image" src="https://github.com/user-attachments/assets/43e3b673-7e19-40fc-99c0-82c45a63a58b" />


## Caracteristicas

*   **Portal del Instructor**: Registro de horas de trabajo para clases particulares y cursos de varios días.
*   **Panel de Administracion**: Gestion de usuarios, empresas y generación de nóminas.
*   **Precios Dinamicos**: Cálculo automático de importes brutos/netos basado en tarifas específicas de la empresa y deducciones de seguridad social.
*   **Acceso Basado en Roles**: Permisos granulares para Administradores, Gerentes y Trabajadores.
*   **Interfaz Moderna**: Construida con Next.js 14 y Tailwind CSS para una experiencia adaptable a dispositivos móviles.

## Roles y Funcionalidades

La plataforma está diseñada para diferentes niveles de acceso, asegurando que cada usuario tenga las herramientas necesarias para su función:

### Administrador del Sistema (Super Admin)
El nivel más alto de control, encargado del mantenimiento de la plataforma.
*   **Gestión Global**: Creación y configuración de nuevas escuelas (empresas).
*   **Control de Usuarios**: Administración de todos los usuarios registrados en el sistema.
*   **Ajustes**: Configuración de variables globales del sistema.

### Gestor de Escuela (Manager)
El director o responsable administrativo de una escuela de esquí concreta.
*   **Equipo**: Gestión de altas y bajas de instructores.
*   **Tarificación**: Definición de tarifas personalizadas por instructor (Hora, Día, Coordinación, Nocturnidad).
*   **Supervisión**: Visualización y validación de todos los partes de trabajo generados por su equipo.
*   **Nóminas**: Generación de reportes detallados para el cálculo de nóminas y pagos.

### Instructor / Cliente (Worker)
El profesional que imparte las clases. Su interfaz está optimizada para el uso rápido en pistas.
*   **Registro de Clases**: Formulario simplificado para registrar clases particulares o días de cursillo.
*   **Historial**: Acceso completo a su historial de trabajos realizados.
*   **Transparencia**: Visualización del cálculo de sus ingresos (Bruto/Neto) según las tarifas pactadas.

## Galería

Aquí puedes ver algunas capturas de pantalla de la aplicación en funcionamiento:

**USER**
<img width="1919" height="963" alt="Captura de pantalla 2026-02-09 205608" src="https://github.com/user-attachments/assets/14181b2a-2858-47a2-a5b6-f572baa867c5" />
<img width="1919" height="965" alt="Captura de pantalla 2026-02-09 205633" src="https://github.com/user-attachments/assets/952db0b5-9bea-4a77-ad4f-88bc1531c1b0" />
<img width="1919" height="963" alt="Captura de pantalla 2026-02-09 205648" src="https://github.com/user-attachments/assets/4c5632d4-2253-48ed-a6e9-e454d9f4caa2" />
<img width="1919" height="962" alt="Captura de pantalla 2026-02-09 205657" src="https://github.com/user-attachments/assets/fc719d1d-08cb-4c3a-9bae-9211af10a8c7" />
**ADMIN**
<img width="1919" height="962" alt="Captura de pantalla 2026-02-09 210357" src="https://github.com/user-attachments/assets/67f9839f-24a2-401d-921d-6b55703091c2" />
<img width="1919" height="960" alt="Captura de pantalla 2026-02-09 211051" src="https://github.com/user-attachments/assets/5c428d1d-fbfb-4401-bfa4-5359ffe34ec4" />

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

4.  **Inicializar Base de Datos**:
    Ejecuta el script incluido para crear las empresas por defecto y el usuario administrador.
    ```bash
    docker compose exec backend python init_db.py
    ```
    *Crea usuario: `admin@example.com` / Password: `admin123`*

5.  **Acceder a la App**:
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

# Configuración de Correo (Imprescindible para 2FA)
MAIL_USERNAME=tu_email@gmail.com
MAIL_PASSWORD=tu_contraseña_de_aplicacion
MAIL_FROM=tu_email@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_FROM_NAME="Vesotel Ski"
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
USE_CREDENTIALS=True

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
