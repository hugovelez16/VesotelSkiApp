# Proyecto: Ski Vesotel (Producción)

Plataforma de gestión integral para escuela de esquí. Permite a los profesores registrar sus horas (clases particulares, cursillos) y a la administración gestionar nóminas, tarifas y usuarios.

## Arquitectura del Sistema

El sistema sigue una arquitectura de microservicios contenerizada:

### 1. Frontend (`vesotel_frontend_container`)

* **Framework**: Next.js 14 (App Router).
* **Puerto**: 3000 (Expuesto vía Caddy en `classeski.vesotel.com`).
* **Build**: Producción (Optiminzado).

### 2. Backend (`vesotel_backend_container`)

* **Framework**: Python FastAPI / SQLAlchemy.
* **Base de Datos**: PostgreSQL 16.
* **Puerto**: 8000.
* **Auth**: JWT + Soporte OIDC (Authentik).

---

## 🗄️ Estructura de Base de Datos

El núcleo del sistema es una base de datos relacional que gestiona usuarios, empresas (escuelas) y partes de trabajo.

### Diagrama Entidad-Relación (UML)

### Detalles de Tablas Principales

1. **Users (`users`)**:
   
   * Tabla central. Almacena credenciales y perfil básico.
   * `role`: Define si es Administrador del sistema o Usuario normal.
   * `default_company_id`: Empresa predeterminada que ve el usuario al loguearse.

2. **Companies (`companies`)**:
   
   * Representa las escuelas de esquí o entidades legales.
   * `social_security_deduction`: Porcentaje de SS por defecto para la empresa.

3. **CompanyMember (`company_members`)**:
   
   * **Tabla Pivote (Many-to-Many)** entre Users y Companies.
   * Define quién trabaja dónde y **qué rol tiene en esa empresa específica** (Worker vs Manager).

4. **UserCompanyRate (`user_company_rates`)**:
   
   * Establece cuánto cobra un usuario específico en una empresa específica.
   * Permite definir si el precio acordado es **Bruto** (`is_gross=True`) o Neto.
   * Almacena retenciones personales (IRPF).

5. **WorkLog (`work_logs`)**:
   
   * El registro diario de actividad (Parte de trabajo).
   * Tipos: `particular` (por horas) o `tutorial` (cursillos por día).
   * Calcula automáticamente `amount` (Neto) y `gross_amount` (Bruto) basándose en las tarifas vigentes (.rates) en el momento de la creación.

---

## Ciclo de Vida del Dato (WorkLog)

1. **Creación**: El usuario (o admin) crea un WorkLog.
2. **Cálculo**: El Backend busca la `UserCompanyRate` asociada al usuario y empresa.
3. **Pricing**:
   * Si es `particular`: `horas * precio_hora`.
   * Si es `tutorial`: `precio_dia`.
   * Se aplican deducciones (IRPF, SS) para guardar siempre tanto el valor Bruto como el Neto.
4. **Persistencia**: Se guarda en `work_logs`.

---

## Arquitectura de Seguridad y Acceso

El acceso público a la aplicación (`classeski.vesotel.com`) sigue un esquema de **Defensa en Profundidad** con 3 capas, diseñado para exponer este servicio local a internet de forma segura sin abrir puertos en el router doméstico.

### Diagrama de Flujo

### Capa 1: Reverse Proxy (Plesk)

* **Rol**: Puerta de enlace pública.
* **Seguridad**: Termina la conexión SSL/TLS con certificados **Let's Encrypt**.
* **Routing**: Recibe tráfico en `classeski.vesotel.com` y lo redirige internamente a `localhost:12001`.

### Capa 2: Túnel SSH Reverso

* **Rol**: Transporte seguro ("Tubería").
* **Funcionamiento**: Conecta el puerto remoto `12001` con el puerto local `3000`.
* **Autenticación**: Claves SSH (ed25519) sin contraseña.
* **Persistencia**: Gestionado por un servicio SystemD (`classeski-tunnel.service`) que asegura reconexión automática.

### Capa 3: Docker (Contenedores)

* **Aislamiento**: Red privada `vesotel_network`. La Base de Datos NO está expuesta ni siquiera al host, solo al Backend.
* **Usuarios**: Los contenedores corren con usuarios no privilegiados (UID 1000) para minimizar riesgos.
