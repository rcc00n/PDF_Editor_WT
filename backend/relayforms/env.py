import logging
import os

logger = logging.getLogger(__name__)

TRUE_VALUES = {'1', 'true', 'yes', 'on'}
FALSE_VALUES = {'0', 'false', 'no', 'off'}


def env_str(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None:
        return default
    value = value.strip()
    return value or default


def env_bool(name: str, default: bool = False) -> bool:
    value = env_str(name)
    if value is None:
        return default
    normalized = value.lower()
    if normalized in TRUE_VALUES:
        return True
    if normalized in FALSE_VALUES:
        return False
    logger.warning("Invalid boolean env %s=%r; using default %s", name, value, default)
    return default


def env_int(name: str, default: int | None = None) -> int | None:
    value = env_str(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Invalid integer env %s=%r; using default %s", name, value, default)
        return default


def env_list(name: str) -> list[str]:
    value = env_str(name)
    if not value:
        return []
    return [item.strip() for item in value.split(',') if item.strip()]
