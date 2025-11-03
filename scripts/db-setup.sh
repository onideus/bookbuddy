#!/bin/bash

# Database Setup Script for BookBuddy
# This script helps manage the PostgreSQL database using Docker

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}BookBuddy Database Setup${NC}"
echo "================================"

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    echo "Please install Docker and docker-compose first"
    exit 1
fi

# Function to start the database
start_db() {
    echo -e "${YELLOW}Starting PostgreSQL database...${NC}"
    docker-compose up -d postgres

    echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
    sleep 5

    # Wait for health check
    until docker-compose exec -T postgres pg_isready -U booktracker -d booktracker > /dev/null 2>&1; do
        echo "Waiting for database to be ready..."
        sleep 2
    done

    echo -e "${GREEN}✓ Database is ready!${NC}"
}

# Function to stop the database
stop_db() {
    echo -e "${YELLOW}Stopping PostgreSQL database...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Database stopped${NC}"
}

# Function to reset the database
reset_db() {
    echo -e "${RED}WARNING: This will delete all data!${NC}"
    read -p "Are you sure you want to reset the database? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        echo -e "${YELLOW}Stopping and removing database...${NC}"
        docker-compose down -v
        echo -e "${GREEN}✓ Database reset complete${NC}"
        echo -e "${YELLOW}Starting fresh database...${NC}"
        start_db
    else
        echo "Reset cancelled"
        exit 0
    fi
}

# Function to run migrations
migrate() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    npm run db:migrate
    echo -e "${GREEN}✓ Migrations complete${NC}"
}

# Function to open psql shell
shell() {
    echo -e "${YELLOW}Opening PostgreSQL shell...${NC}"
    docker-compose exec postgres psql -U booktracker -d booktracker
}

# Function to show database status
status() {
    echo -e "${YELLOW}Database Status:${NC}"
    docker-compose ps postgres
    echo ""
    echo -e "${YELLOW}Database Connection Info:${NC}"
    echo "Host: localhost"
    echo "Port: 5432"
    echo "Database: booktracker"
    echo "User: booktracker"
    echo "Password: booktracker_dev_password"
    echo ""
    echo "Connection String:"
    echo "postgresql://booktracker:booktracker_dev_password@localhost:5432/booktracker?schema=public"
}

# Function to show logs
logs() {
    docker-compose logs -f postgres
}

# Main command handler
case "$1" in
    start)
        start_db
        ;;
    stop)
        stop_db
        ;;
    restart)
        stop_db
        start_db
        ;;
    reset)
        reset_db
        ;;
    migrate)
        migrate
        ;;
    shell)
        shell
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    setup)
        start_db
        echo ""
        echo -e "${YELLOW}Setting up .env file...${NC}"
        if [ ! -f .env ]; then
            cp services/api/.env.example .env
            echo -e "${GREEN}✓ Created .env file from template${NC}"
            echo -e "${YELLOW}Please update JWT_SECRET and other settings in .env${NC}"
        else
            echo -e "${YELLOW}.env file already exists, skipping...${NC}"
        fi
        echo ""
        migrate
        echo ""
        echo -e "${GREEN}✓ Database setup complete!${NC}"
        echo -e "${YELLOW}You can now run: npm run dev${NC}"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|reset|migrate|shell|status|logs|setup}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the PostgreSQL database"
        echo "  stop    - Stop the PostgreSQL database"
        echo "  restart - Restart the PostgreSQL database"
        echo "  reset   - Delete all data and start fresh (requires confirmation)"
        echo "  migrate - Run Prisma migrations"
        echo "  shell   - Open PostgreSQL shell (psql)"
        echo "  status  - Show database status and connection info"
        echo "  logs    - Show database logs (follows)"
        echo "  setup   - Complete setup (start db, create .env, run migrations)"
        exit 1
        ;;
esac

exit 0
