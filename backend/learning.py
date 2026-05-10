# stores:

# anomalies
# actions taken
# outcomes
# success/failure
# learning.py

learning_memory = []

def store_outcome(alert, action, success):

    learning_memory.append({

        "alert": alert,
        "action": action,
        "success": success
    })


def get_best_action(alert):

    successful_actions = []

    for item in learning_memory:

        if item["alert"] == alert and item["success"]:

            successful_actions.append(item["action"])

    if successful_actions:

        return successful_actions[-1]

    return None