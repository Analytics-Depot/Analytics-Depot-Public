# Analytics Depot

A modern web application for data analytics and visualization, powered by FastAPI, Next.js, and OpenAI.

## Features

- Real-time data analysis and visualization
- AI-powered insights using OpenAI GPT-4
- Secure user authentication and authorization
- File upload and processing support
- Interactive chat interface
- Beautiful and responsive UI
- Chat system with industry-specific contexts
- Admin dashboard
- File processing capabilities

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- OpenAI API key and organization ID
- SSL certificates for production deployment
- Nginx

## Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/CaptnGreenOwl/analytics-depot.git
   cd analytics-depot
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your configuration:

   - Set your OpenAI API key and organization ID
   - Configure your database credentials
   - Set your JWT secret key
   - Update other environment variables as needed

4. Run with Docker Compose (recommended):

   ```bash
   # Start all services (backend, frontend, database)
   docker-compose up -d
   ```

5. Access the application:
   - Development: http://localhost:3000
   - Production: https://analyticsdepot.com

## Development Setup

1. Backend setup:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   ```

2. Frontend setup:

   ```bash
   cd frontend
   npm install
   ```

3. Run services individually:

   ```bash
   # Backend (choose one of the following methods)
   cd backend
   python3 main.py  # Option 1: Run directly with Python
   # OR
   uvicorn main:app --reload  # Option 2: Run with uvicorn for hot reloading

   # Frontend
   cd frontend
   npm run dev

   # Database
   docker-compose up db
   ```

## Production Deployment

### Initial Setup

1. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```

### Nginx Configuration

The project includes Nginx configuration files in the `deployment/nginx` directory:

- `nginx.conf`: Main Nginx configuration
- `analytics-depot.conf`: Site-specific configuration

### SSL Configuration

1. Install Certbot:

   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. Obtain SSL certificate:
   ```bash
   sudo certbot --nginx -d analyticsdepot.com -d www.analyticsdepot.com
   ```

### Static Files

For optimal performance, ensure static files are properly configured:

- Set appropriate file permissions for static assets
- Configure Nginx to serve static files with proper caching headers
- Ensure static assets are being built during the deployment process

### Troubleshooting

If you encounter 403 or 404 errors:

1. Check file permissions in `/opt/analytics-depot/frontend/.next/static`
2. Verify Nginx configuration
3. Check container logs: `docker-compose logs`

## Architecture

The application follows a microservices architecture:

- Frontend (Next.js):

  - Server-side rendering
  - Tailwind CSS for styling
  - Real-time data visualization

- Backend (FastAPI):

  - RESTful API endpoints
  - Consolidated chat functionality
  - OpenAI integration
  - File processing

- Database (PostgreSQL):
  - User management
  - Chat history
  - Analytics data

## Project Structure

```
.
├── backend/                      # Backend FastAPI application
│   ├── alembic/                 # Database migrations
│   ├── app/                     # Main application code
│   │   ├── core/              # Core configuration
│   │   ├── db/                # Database setup
│   │   ├── models/            # Database models
│   │   ├── repositories/      # Data access layer
│   │   ├── routers/          # API routes
│   │   │   ├── admin.py     # Admin endpoints
│   │   │   ├── auth.py      # Authentication
│   │   │   ├── chats.py     # Consolidated chat functionality
│   │   │   ├── files.py     # File processing
│   │   │   ├── terminal.py  # Secure terminal operations
│   │   │   └── users.py     # User management
│   │   ├── services/         # Business logic
│   │   │   ├── analysis/    # Data analysis services
│   │   │   └── openai_service.py # OpenAI integration
│   │   └── utils/           # Utility functions
│   └── main.py              # Application entry point
├── frontend/                    # Frontend Next.js application
│   ├── components/             # React components
│   │   └── admin/            # Admin dashboard components
│   ├── config.js              # Centralized configuration
│   ├── pages/                 # Next.js pages
│   │   ├── admin/           # Admin routes
│   │   ├── api/            # API routes
│   │   └── chat.js         # Main chat interface
│   └── styles/              # CSS styles
└── sample_documents/           # Sample data for testing
```

## API Documentation

- Swagger UI: https://api.analyticsdepot.com/docs
- ReDoc: https://api.analyticsdepot.com/redoc

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT License
