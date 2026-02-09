# ⛷️ Ski Vesotel - School Management Platform

**Ski Vesotel** is a comprehensive management platform designed for ski schools. It streamlines operations by allowing instructors to log their hours (private lessons, courses) and enabling administration to manage payrolls, rates, and user roles efficiently.

![Ski Vesotel Banner](https://via.placeholder.com/1200x500?text=Ski+Vesotel+Platform)

## 🚀 Features

*   **Instructor Portal**: Log work hours for private lessons and multi-day courses.
*   **Admin Dashboard**: Manage users, companies, and payroll generation.
*   **Dynamic Pricing**: Automatic calculation of gross/net amounts based on specific company rates and social security deductions.
*   **Role-Based Access**: Granular permissions for Admins, Managers, and Workers.
*   **Modern UI**: Built with Next.js 14 and Tailwind CSS for a responsive experience.

## 🛠️ Tech Stack

This project follows a microservices architecture provided by Docker:

*   **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), Tailwind CSS.
*   **Backend**: [FastAPI](https://fastapi.tiangolo.com/) (Python), SQLAlchemy.
*   **Database**: [PostgreSQL 16](https://www.postgresql.org/).
*   **Reverse Proxy**: Caddy (managed externally via Plesk/Docker).

## 📦 Architecture

The system is composed of the following Docker containers:

| Service | Container Name | Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | `vesotel_frontend_container` | `3000` | Next.js application (Production build). |
| **Backend** | `vesotel_backend_container` | `8000` | FastAPI application. |
| **Database** | `vesotel_postgres_container` | `5432` | PostgreSQL database. |

## 🚀 Getting Started

### Prerequisites

*   [Docker](https://docs.docker.com/get-docker/) installed.
*   [Docker Compose](https://docs.docker.com/compose/install/) installed.
*   Git.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/hugovelez16/VesotelSkiApp.git
    cd VesotelSkiApp
    ```

2.  **Environment Setup**:
    Create a `.env` file in the root directory based on `.env.example`.
    ```bash
    cp .env.example .env
    ```
    *Edit `.env` and fill in your specific database credentials and secret keys.*

3.  **Start the Application**:
    ```bash
    docker compose up -d --build
    ```

4.  **Access the App**:
    *   Frontend: `http://localhost:3000`
    *   Backend API Docs: `http://localhost:8000/docs`

## ⚙️ Configuration

### Environment Variables

Ensure your `.env` file contains the following critical variables:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=vesotel_db

# Backend
SECRET_KEY=your_generated_secret_key
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
