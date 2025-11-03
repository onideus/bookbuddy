# Database Setup Guide

This guide explains how to set up and manage the PostgreSQL database for BookBuddy API using Docker.

## Quick Start

For a complete setup (starts database, creates .env, runs migrations):

```bash
npm run db:setup
```

Then start the API:

```bash
npm run dev
```

## Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed

## Available Commands

### Setup & Management

```bash
# Complete setup (first-time setup)
npm run db:setup

# Start the database
npm run db:start

# Stop the database
npm run db:stop

# Restart the database
npm run db:restart

# Reset database (deletes all data!)
npm run db:reset
```

### Database Operations

```bash
# Run migrations
npm run db:migrate

# Push schema changes without migrations
npm run db:push

# Generate Prisma Client
npm run db:generate

# Open PostgreSQL shell
npm run db:shell

# View database status
npm run db:status

# View database logs
npm run db:logs
```

## Database Configuration

### Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: booktracker
- **User**: booktracker
- **Password**: booktracker_dev_password

### Connection String

```
postgresql://booktracker:booktracker_dev_password@localhost:5432/booktracker?schema=public
```

This connection string is already configured in `services/api/.env.example`.

## Docker Compose Services

The `docker-compose.yml` file defines:

- **PostgreSQL 16 Alpine** - Lightweight PostgreSQL image
- **Volume** - `postgres_data` for persistent storage
- **Health Check** - Automatic health monitoring
- **Network** - Isolated network for services

### Starting Manually

```bash
# Start in detached mode
docker-compose up -d

# Start and view logs
docker-compose up

# Stop services
docker-compose down

# Stop and remove volumes (deletes all data!)
docker-compose down -v
```

## Database Migrations

### Creating Migrations

When you modify the Prisma schema (`prisma/schema.prisma`):

```bash
# Create and apply migration
npm run db:migrate

# Or use Prisma directly
npx prisma migrate dev --name your_migration_name
```

### Applying Migrations

```bash
# Development
npm run db:migrate

# Production
npx prisma migrate deploy
```

### Migration Files

Migrations are stored in `prisma/migrations/` and tracked by Git.

## Troubleshooting

### Database Won't Start

```bash
# Check if port 5432 is already in use
lsof -i :5432

# View container logs
npm run db:logs

# Check container status
docker-compose ps
```

### Connection Refused

1. Ensure database is running:
   ```bash
   npm run db:status
   ```

2. Check that `.env` has correct DATABASE_URL

3. Wait for health check to pass (can take 10-15 seconds on first start)

### Reset Everything

If you encounter persistent issues:

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove any orphaned containers
docker system prune

# Start fresh
npm run db:setup
```

### Migration Conflicts

If migrations fail:

```bash
# Reset database schema (development only!)
npx prisma migrate reset

# This will:
# - Drop the database
# - Create a new database
# - Apply all migrations
# - Run seed scripts (if configured)
```

## Data Persistence

Database data is stored in a Docker volume named `postgres_data`. This persists even when containers are stopped.

To view volume details:
```bash
docker volume inspect bookbuddy-mk3_postgres_data
```

To delete all data:
```bash
docker-compose down -v
```

## Production Considerations

For production deployment:

1. **Change Credentials**: Use strong passwords, not the development defaults
2. **SSL/TLS**: Enable SSL for connections
3. **Backups**: Implement regular backup strategy
4. **Monitoring**: Set up database monitoring
5. **Connection Pooling**: Configure appropriate pool size
6. **Environment Variables**: Use secrets management, not .env files

### Example Production Connection

```bash
DATABASE_URL="postgresql://prod_user:strong_password@db.example.com:5432/bookbuddy_prod?schema=public&sslmode=require"
```

## Prisma Studio

To explore your database with a GUI:

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` to view and edit data.

## Backup and Restore

### Backup

```bash
# Using docker-compose
docker-compose exec postgres pg_dump -U booktracker booktracker > backup.sql

# Or using the host's pg_dump
pg_dump -h localhost -U booktracker booktracker > backup.sql
```

### Restore

```bash
# Using docker-compose
docker-compose exec -T postgres psql -U booktracker booktracker < backup.sql

# Or create a fresh database first
npm run db:reset
docker-compose exec -T postgres psql -U booktracker booktracker < backup.sql
```

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Database Schema

See `prisma/schema.prisma` for the complete schema definition.

Current models:
- `User` - User accounts
- `Book` - Books in user libraries
- `Goal` - Reading goals
- `RefreshToken` - JWT refresh tokens

## Environment Variables

Required environment variables (see `.env.example`):

```bash
DATABASE_URL="postgresql://booktracker:booktracker_dev_password@localhost:5432/booktracker?schema=public"
JWT_SECRET="your-jwt-secret"
JWT_ACCESS_TOKEN_EXPIRY="15m"
JWT_REFRESH_TOKEN_EXPIRY="7d"
PORT=4000
NODE_ENV=development
```
