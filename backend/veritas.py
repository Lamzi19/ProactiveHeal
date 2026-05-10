# engine.py

class VeritasEngine:

    def __init__(self):

        # Critical infrastructure components
        # AI should NEVER directly modify these
        self.protected_resources = [
            "core-database",
            "auth-service",
            "payment-gateway"
        ]

        # Dangerous operations blocked globally
        self.forbidden_actions = [
            "delete",
            "drop",
            "shutdown",
            "rm -rf",
            "wipe"
        ]

        # Minimum AI confidence required
        # before autonomous execution is allowed
        self.minimum_confidence = 0.75


    def analyze_blast_radius(self, target):

        # Estimate how much infrastructure
        # could be affected by this action

        critical_targets = [
            "cluster",
            "gateway",
            "database"
        ]

        for item in critical_targets:

            if item in target.lower():

                return "HIGH"

        return "LOW"


    def classify_severity(self, action):

        # Categorize remediation severity
        # based on operational risk

        low = [
            "scale",
            "rebalance",
            "clear cache"
        ]

        medium = [
            "restart",
            "drain node"
        ]

        high = [
            "delete",
            "shutdown",
            "kill"
        ]

        for item in high:

            if item in action.lower():

                return "HIGH"

        for item in medium:

            if item in action.lower():

                return "MEDIUM"

        return "LOW"


    def validate_action(
        self,
        action,
        target,
        confidence
    ):

        action_lower = action.lower()

        # -----------------------------------
        # 1. Forbidden Action Check
        # Prevent destructive AI operations
        # -----------------------------------

        for forbidden in self.forbidden_actions:

            if forbidden in action_lower:

                return {
                    "approved": False,
                    "reason": f"Forbidden action detected: {forbidden}",
                    "risk": "CRITICAL",
                    "fallback": "Escalate to SRE Team"
                }

        # -----------------------------------
        # 2. Protected Resource Check
        # Prevent modification of critical infra
        # -----------------------------------

        for resource in self.protected_resources:

            if resource in target.lower():

                return {
                    "approved": False,
                    "reason": f"Protected resource targeted: {resource}",
                    "risk": "HIGH",
                    "fallback": "Manual approval required"
                }

        # -----------------------------------
        # 3. Confidence Threshold Check
        # Low-confidence AI actions are blocked
        # -----------------------------------

        if confidence < self.minimum_confidence:

            return {
                "approved": False,
                "reason": "AI confidence below autonomous threshold",
                "risk": "MEDIUM",
                "fallback": "Request human verification"
            }

        # -----------------------------------
        # 4. Blast Radius Analysis
        # Check possible infrastructure impact
        # -----------------------------------

        blast_radius = self.analyze_blast_radius(target)

        if blast_radius == "HIGH":

            return {
                "approved": False,
                "reason": "Potential high blast radius detected",
                "risk": "HIGH",
                "fallback": "Use safer remediation strategy"
            }

        # -----------------------------------
        # 5. Severity Classification
        # Final operational risk assessment
        # -----------------------------------

        severity = self.classify_severity(action)

        # If all checks pass,
        # autonomous execution is approved

        return {
            "approved": True,
            "reason": "Action validated successfully",
            "risk": "LOW",
            "severity": severity,
            "blast_radius": blast_radius,
            "confidence": confidence,
            "fallback": None
        }