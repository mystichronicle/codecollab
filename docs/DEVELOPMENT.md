# Development Guide

## Getting Started

### Prerequisites

- Docker Desktop 20.10+
- Docker Compose 2.0+
- Git

### Quick Start

```bash
# Clone and enter project
cd /home/debjit/Programming/new_project

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Development Workflow

### 1. Making Changes

Each service has hot-reload enabled for rapid development:

- **Python services**: Auto-reload with `--reload` flag
- **Go service**: Requires rebuild (`docker-compose up -d --build collab-service`)
- **Rust service**: Requires rebuild
- **V service**: Requires rebuild
- **Zig service**: Requires rebuild
- **Elixir service**: Hot code reloading built-in
- **Frontend**: Vite HMR enabled

### 2. Running Individual Services

```bash
# Python example (API Gateway)
cd services/api-gateway
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Go example (Collab Service)
cd services/collab-service
go mod download
go run cmd/server/main.go
```

### 3. Testing

```bash
# Python services
docker-compose exec api-gateway pytest

# Go service
docker-compose exec collab-service go test ./...

# Rust service
docker-compose exec execution-service cargo test
```

### 4. Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U codecollab -d codecollab

# Access MongoDB
docker-compose exec mongodb mongosh -u codecollab -p dev_password_change_in_prod

# Access Redis
docker-compose exec redis redis-cli
```

## Code Standards

### General Principles

1. **DRY**: Don't repeat code - use shared libraries
2. **Functions**: Keep under 20 lines when possible
3. **Naming**: Clear, descriptive names
4. **Comments**: Only when code intent isn't obvious
5. **Error Handling**: Always handle errors explicitly

### Python Standards

```python
# Good: Short, focused function
async def validate_user_token(token: str) -> User:
    """Validate JWT token and return user."""
    try:
        payload = decode_jwt(token)
        return await fetch_user(payload["user_id"])
    except InvalidTokenError as e:
        logger.error(f"Token validation failed: {e}")
        raise UnauthorizedError("Invalid token")

# Bad: Long, unclear function
async def do_stuff(token):
    # 50 lines of code...
    pass
```

### Error Handling Patterns

```python
# Python: Explicit error handling
try:
    result = await risky_operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    raise
```

```go
// Go: Error return values
result, err := riskyOperation()
if err != nil {
    log.Printf("Operation failed: %v", err)
    return err
}
```

```rust
// Rust: Result type
match risky_operation() {
    Ok(result) => process(result),
    Err(e) => {
        error!("Operation failed: {}", e);
        return Err(e);
    }
}
```

### Logging Standards

```python
# Good: Structured, contextual
logger.info(f"User {user_id} created session {session_id}")
logger.error(f"Failed to process request: {error}", exc_info=True)

# Bad: Vague, no context
logger.info("Something happened")
```

## Adding a New Feature

1. **Plan**: Define requirements and service placement
2. **API Contract**: Define request/response models
3. **Implementation**: Write code following standards
4. **Testing**: Write unit and integration tests
5. **Documentation**: Update relevant docs
6. **Review**: Self-review checklist

## Debugging

### Viewing Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway

# Last 100 lines
docker-compose logs --tail=100 api-gateway
```

### Accessing Service Shell

```bash
# Python service
docker-compose exec api-gateway /bin/sh

# Go service
docker-compose exec collab-service /bin/sh
```

### Common Issues

**Service won't start:**
```bash
# Check service health
docker-compose ps

# View detailed logs
docker-compose logs [service-name]

# Rebuild if needed
docker-compose up -d --build [service-name]
```

**Database connection issues:**
```bash
# Verify database is running
docker-compose ps postgres

# Check connection
docker-compose exec api-gateway python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

## Performance Optimization

### Caching Strategy

- Use Redis for frequently accessed data
- Cache duration based on data volatility
- Invalidate cache on updates

### Database Queries

- Use indexes appropriately
- Avoid N+1 queries
- Use connection pooling

### Resource Management

- Clean up resources in finally blocks
- Close connections explicitly
- Use context managers

## Security Best Practices

1. **Never commit secrets** - use environment variables
2. **Validate all inputs** - never trust user data
3. **Use parameterized queries** - prevent SQL injection
4. **Sanitize outputs** - prevent XSS
5. **Rate limiting** - prevent abuse
6. **HTTPS only** - in production

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [API Documentation](http://localhost:8000/docs)
- Review service-specific READMEs
