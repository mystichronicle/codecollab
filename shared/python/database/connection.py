"""
Shared database utilities following DRY principles.
Reusable across all Python services.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)


class DatabaseConnection:
    """Base database connection manager."""
    
    def __init__(self, url: str):
        self.url = url
        self._connection = None
    
    async def connect(self):
        """Establish database connection."""
        raise NotImplementedError
    
    async def disconnect(self):
        """Close database connection."""
        raise NotImplementedError
    
    @asynccontextmanager
    async def transaction(self):
        """Provide transaction context."""
        raise NotImplementedError


def sanitize_db_url(url: str) -> str:
    """Remove credentials from URL for safe logging."""
    if '@' in url:
        protocol, rest = url.split('://', 1)
        if '@' in rest:
            _, host_part = rest.split('@', 1)
            return f"{protocol}://***@{host_part}"
    return url
