# Database Setup Guide

## 📊 Database Auto-Setup (Already Done!)

Your database is **automatically configured** when you start the platform with `./start.sh` or `docker-compose up`.

### What Gets Created Automatically:
- ✅ PostgreSQL 16 database named `codecollab`
- ✅ User: `codecollab` with password: `dev_password_change_in_prod`
- ✅ `users` table with proper schema
- ✅ Indexes for performance
- ✅ Connection on port 5432

---

## 🔍 Verify Database Setup

### Check if Database is Running
```bash
docker ps | grep postgres
```

### Check Tables
```bash
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c "\dt"
```

### View Users
```bash
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c "SELECT id, username, email, is_active FROM users;"
```

### Check Database Schema
```bash
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c "\d users"
```

---

## 🗄️ Database Connection Details

| Parameter | Value |
|-----------|-------|
| **Host** | localhost (or `postgres` from Docker network) |
| **Port** | 5432 |
| **Database** | codecollab |
| **Username** | codecollab |
| **Password** | dev_password_change_in_prod |
| **Connection String** | `postgresql://codecollab:dev_password_change_in_prod@localhost:5432/codecollab` |

---

## 💾 Database Operations

### Connect to PostgreSQL CLI
```bash
# Interactive psql shell
docker exec -it codecollab-postgres psql -U codecollab -d codecollab

# Once connected, you can run SQL:
# \dt              - List all tables
# \d users         - Describe users table
# SELECT * FROM users;
# \q               - Quit
```

### Run SQL Queries
```bash
# Check all users
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c "SELECT * FROM users;"

# Count users
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c "SELECT COUNT(*) FROM users;"

# Find specific user
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c "SELECT * FROM users WHERE username='testuser';"
```

### Create New User Manually (via SQL)
```bash
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c "
INSERT INTO users (email, username, password_hash, is_active, created_at, updated_at) 
VALUES ('newuser@example.com', 'newuser', '\$2b\$12\$hashedpassword', true, NOW(), NOW());
"
```

**Note:** It's better to create users via the API (http://localhost:8000/docs) so passwords are properly hashed.

---

## 🔄 Database Reset/Reinitialize

### Option 1: Keep Data, Restart Database
```bash
docker-compose restart postgres
```

### Option 2: Clear All Data (Fresh Start)
```bash
# Stop and remove database container with data
docker-compose down -v postgres

# Restart (will recreate with empty database)
docker-compose up -d postgres

# Wait 5 seconds, then initialize schema
sleep 5
docker-compose exec api-gateway python -m app.init_db
```

### Option 3: Delete Specific User
```bash
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c "
DELETE FROM users WHERE username='testuser';
"
```

---

## 🛠️ Manual Database Initialization

If the database tables weren't created automatically:

```bash
# Method 1: Using the init script
docker-compose exec api-gateway python -m app.init_db

# Method 2: Using SQL directly
docker exec -it codecollab-postgres psql -U codecollab -d codecollab << 'EOF'
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
EOF
```

---

## 📊 Database GUI Tools (Optional)

You can use GUI tools to manage the database:

### 1. DBeaver (Free)
- Download: https://dbeaver.io/
- Connection: Use details from "Database Connection Details" above

### 2. pgAdmin (Free)
```bash
# Run pgAdmin in Docker
docker run -d \
  --name pgadmin \
  --network new_project_codecollab-network \
  -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@admin.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  dpage/pgadmin4

# Access at: http://localhost:5050
# Login: admin@admin.com / admin
# Add server: postgres / codecollab / dev_password_change_in_prod
```

### 3. TablePlus (Mac/Windows)
- Download: https://tableplus.com/
- Create new PostgreSQL connection with details above

### 4. VS Code Extension
- Install: "PostgreSQL" extension by Chris Kolkman
- Connect using connection string

---

## 🔒 Security Notes

### For Development (Current Setup)
- ✅ Password is simple: `dev_password_change_in_prod`
- ✅ Database is accessible from localhost
- ✅ No SSL required

### For Production (Change These!)
```bash
# 1. Change database password
docker-compose down
# Edit docker-compose.yml:
#   POSTGRES_PASSWORD: use_strong_random_password_here

# 2. Use environment variables
# Create .env file:
DATABASE_URL=postgresql://codecollab:STRONG_PASSWORD@postgres:5432/codecollab

# 3. Enable SSL/TLS
# Add to PostgreSQL config
```

---

## 🧪 Test Database Connection

### From Backend (API Gateway)
```bash
# Check health endpoint (includes DB check)
curl http://localhost:8000/health/db
```

### From Command Line
```bash
# Test connection
docker exec codecollab-postgres pg_isready -U codecollab

# Should output: "postgres:5432 - accepting connections"
```

### Test Full Auth Flow
```bash
# Register new user (creates DB entry)
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dbtest@example.com",
    "username": "dbtest",
    "password": "password123"
  }'

# Verify in database
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c \
  "SELECT * FROM users WHERE username='dbtest';"
```

---

## 📦 Database Backups

### Create Backup
```bash
# Backup to file
docker exec codecollab-postgres pg_dump -U codecollab codecollab > backup_$(date +%Y%m%d).sql

# Or with Docker
docker exec codecollab-postgres pg_dump -U codecollab codecollab | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore from Backup
```bash
# Restore from file
cat backup_20251102.sql | docker exec -i codecollab-postgres psql -U codecollab codecollab

# Or from gzipped backup
gunzip -c backup_20251102.sql.gz | docker exec -i codecollab-postgres psql -U codecollab codecollab
```

---

## 🐛 Troubleshooting

### "Database connection refused"
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs codecollab-postgres

# Restart database
docker-compose restart postgres
```

### "Table doesn't exist"
```bash
# Initialize database
docker-compose exec api-gateway python -m app.init_db
```

### "Password authentication failed"
```bash
# Check password in API Gateway logs
docker logs codecollab-api-gateway | grep password

# Verify password in docker-compose.yml matches
cat docker-compose.yml | grep POSTGRES_PASSWORD
```

### "Too many connections"
```bash
# Check active connections
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Restart to clear connections
docker-compose restart postgres
```

---

## 📈 Database Performance

### Check Database Size
```bash
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c \
  "SELECT pg_size_pretty(pg_database_size('codecollab'));"
```

### View Active Queries
```bash
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c \
  "SELECT pid, age(clock_timestamp(), query_start), usename, query 
   FROM pg_stat_activity 
   WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%';"
```

### Add Indexes (if needed)
```bash
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c \
  "CREATE INDEX idx_users_created_at ON users(created_at);"
```

---

## 🎯 Quick Commands Summary

```bash
# Start database
docker-compose up -d postgres

# Stop database
docker-compose stop postgres

# View logs
docker logs codecollab-postgres -f

# Connect to CLI
docker exec -it codecollab-postgres psql -U codecollab -d codecollab

# View all users
docker exec -it codecollab-postgres psql -U codecollab -d codecollab -c "SELECT * FROM users;"

# Reset database (DANGER: deletes all data!)
docker-compose down -v postgres
docker-compose up -d postgres
docker-compose exec api-gateway python -m app.init_db
```

---

## 🔗 Other Databases in the Stack

### Redis (Cache)
```bash
# Connect to Redis CLI
docker exec -it codecollab-redis redis-cli

# Common Redis commands:
# KEYS *           - List all keys
# GET key          - Get value
# DEL key          - Delete key
# FLUSHALL         - Clear all data
```

### MongoDB (Document Store)
```bash
# Connect to MongoDB
docker exec -it codecollab-mongodb mongosh

# Common MongoDB commands:
# show dbs         - List databases
# use codecollab   - Switch to codecollab database
# show collections - List collections
# db.sessions.find() - Query sessions
```

---

## ✅ Database is Ready!

Your database is already set up and working! You can:

1. **Use it via the API** (recommended): http://localhost:8000/docs
2. **Query it directly**: Use the commands above
3. **Manage with GUI**: Install DBeaver or pgAdmin

**No additional setup needed!** Just start coding and the database will handle everything automatically. 🎉

---

*For more information, see: `DAILY_USE.md` and `PROJECT_COMPLETE.md`*
