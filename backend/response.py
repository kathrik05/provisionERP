from typing import Any, Dict, Optional


def success(data: Any = None, message: str = "success") -> Dict[str, Any]:
    return {"data": data, "message": message, "error": None}


def error(error_message: str, message: str = "error") -> Dict[str, Any]:
    return {"data": None, "message": message, "error": error_message}

