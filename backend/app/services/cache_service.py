import time
import threading
from typing import Any, Dict, Optional, Tuple

class InMemoryCache:
    def __init__(self):
        self._cache: Dict[str, Tuple[Any, float, Optional[float]]] = {}
        self._lock = threading.Lock()

    def set(self, key: str, value: Any, ttl: Optional[float] = None):
        expire_at = time.time() + ttl if ttl else None
        with self._lock:
            self._cache[key] = (value, time.time(), expire_at)

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            item = self._cache.get(key)
            if not item:
                return None
            value, created_at, expire_at = item
            if expire_at and time.time() > expire_at:
                del self._cache[key]
                return None
            return value

    def invalidate(self, key: str):
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def clear(self):
        with self._lock:
            self._cache.clear()

    def keys(self):
        with self._lock:
            return list(self._cache.keys())

# Singleton cache instance
cache = InMemoryCache()

# FAQ/Query cache interface
class QueryCache:
    def __init__(self, cache: InMemoryCache):
        self.cache = cache

    def make_key(self, chat_id: str, query_hash: str) -> str:
        return f"faq:{chat_id}:{query_hash}"

    def get(self, chat_id: str, query_hash: str) -> Optional[Any]:
        return self.cache.get(self.make_key(chat_id, query_hash))

    def set(self, chat_id: str, query_hash: str, value: Any, ttl: Optional[float] = None):
        self.cache.set(self.make_key(chat_id, query_hash), value, ttl)

    def invalidate(self, chat_id: str, query_hash: str):
        self.cache.invalidate(self.make_key(chat_id, query_hash))

# Partial/intermediate result cache interface
class PartialResultCache:
    def __init__(self, cache: InMemoryCache):
        self.cache = cache

    def make_key(self, file_id: str, result_type: str) -> str:
        return f"partial:{file_id}:{result_type}"

    def get(self, file_id: str, result_type: str) -> Optional[Any]:
        return self.cache.get(self.make_key(file_id, result_type))

    def set(self, file_id: str, result_type: str, value: Any, ttl: Optional[float] = None):
        self.cache.set(self.make_key(file_id, result_type), value, ttl)

    def invalidate(self, file_id: str, result_type: str):
        self.cache.invalidate(self.make_key(file_id, result_type))

# Adaptive TTL logic (stub)
def get_adaptive_ttl(document_volatility: float, access_frequency: float) -> float:
    # Example: shorter TTL for volatile docs, longer for hot queries
    base_ttl = 600  # 10 min default
    if document_volatility > 0.5:
        return base_ttl / 2
    if access_frequency > 10:
        return base_ttl * 2
    return base_ttl

# Export cache interfaces
query_cache = QueryCache(cache)
partial_result_cache = PartialResultCache(cache)