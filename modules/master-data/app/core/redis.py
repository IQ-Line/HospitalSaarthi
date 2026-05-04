class RedisNotConfigured:
    """Placeholder for the later cache service wiring."""

    def __getattr__(self, name: str):
        raise RuntimeError(f"Redis is not configured for this learning slice: {name}")
