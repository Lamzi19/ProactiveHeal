def execute_healing(action):
    if "scale" in action.lower():
        return "Scaling worker replicas..."
    elif "restart" in action.lower():
        return "Restarting affected services..."
    elif "redistribute" in action.lower():
        return "Redistributing traffic..."
    return "Executing remediation..."