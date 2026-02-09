# Ski Vesotel - Frontend

El frontend de la plataforma de gestión para la escuela de esquí. Construido con **Next.js 16 (App Router)**, diseñado para ser rápido, moderno y fácil de mantener.

## 🛠️ Stack Tecnológico

Este proyecto utiliza las últimas tecnologías del ecosistema React:

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
*   **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/)
*   **Componentes UI**: [Radix UI](https://www.radix-ui.com/) (primitivas accesibles) & [Lucide React](https://lucide.dev/) (iconos)
*   **Animaciones**: [Framer Motion](https://www.framer.com/motion/)
*   **Estado & Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
*   **Formularios**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) (validación)
*   **Utilidades**: `date-fns`, `clsx`, `tailwind-merge`

## 🏗️ Arquitectura

El frontend se ejecuta dentro de un contenedor Docker (`vesotel_frontend_container`) como parte de la arquitectura de microservicios de Ski Vesotel.

*   **Puerto Local**: `3000`
*   **Backend API**: Se comunica con `vesotel_backend_container` en el puerto `8000`.
*   **Producción**: Servido a través de Caddy Reverse Proxy en `classeski.vesotel.com`.

## 📂 Estructura del Proyecto

La estructura sigue las convenciones del App Router de Next.js:

```
03_Frontend/
├── src/
│   ├── app/                 # Rutas de la aplicación (App Router)
│   │   ├── (app)/           # Rutas protegidas de la aplicación principal (Dashboard, Admin, etc.)
│   │   ├── (auth)/          # Rutas de autenticación (Login)
│   │   └── layout.tsx       # Layout raíz
│   ├── components/          # Componentes reutilizables (UI, Forms, Reports, etc.)
│   ├── hooks/               # Custom React Hooks
│   ├── lib/                 # Utilidades (axios setup, utils)
│   └── types/               # Definiciones de tipos TypeScript compartidos
├── public/                  # Assets estáticos
├── next.config.ts           # Configuración de Next.js
└── package.json             # Dependencias y scripts
```

## 🚀 Getting Started

### Prerrequisitos

*   Node.js 20+ (Recomendado para desarrollo local fuera de Docker)
*   Docker & Docker Compose (Para levantar el entorno completo)

### Desarrollo Local

1.  Instala las dependencias:

```bash
npm install
# o
yarn install
# o
pnpm install
# o
bun install
```

2.  Configura las variables de entorno:
    Asegúrate de tener un archivo `.env` configurado (puedes basarte en `.env.example`).

3.  Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📦 Scripts Disponibles

*   `npm run dev`: Inicia el entorno de desarrollo.
*   `npm run build`: Construye la aplicación para producción.
*   `npm start`: Inicia la aplicación construida en producción.
*   `npm run lint`: Ejecuta el linter (ESLint).
