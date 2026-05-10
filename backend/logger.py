from datetime import datetime

def log(module, message, level="INFO"):
    return {
        "time": datetime.now().strftime("%H:%M:%S"),
        "module": module,
        "level": level,
        "message": message
    }