# Frontend pricing plans - single source of truth
# Backend references this data to ensure consistency

PRICING_PLANS = [
    {
        "name": "Free",
        "price": 0,
        "period": "month",
        "query_limit": 20,
        "file_upload_limit_mb": 2,
        "support_level": "community"
    },
    {
        "name": "Basic",
        "price": 29,
        "period": "month", 
        "query_limit": 100,
        "file_upload_limit_mb": 10,
        "support_level": "standard"
    },
    {
        "name": "Pro",
        "price": 79,
        "period": "month",
        "query_limit": -1,  # Unlimited
        "file_upload_limit_mb": -1,  # Unlimited
        "support_level": "priority"
    },
    {
        "name": "Expert Sessions", 
        "price": 150,
        "period": "hour",
        "query_limit": -1,  # Unlimited
        "file_upload_limit_mb": -1,  # Unlimited
        "support_level": "expert"
    }
]

def get_plan_limits(plan_name: str) -> dict:
    """Get query and file limits for a plan"""
    for plan in PRICING_PLANS:
        if plan["name"].lower() == plan_name.lower():
            return {
                "query_limit": plan["query_limit"],
                "file_limit_mb": plan["file_upload_limit_mb"],
                "support_level": plan["support_level"]
            }
    
    # Default to free tier if plan not found
    return {
        "query_limit": 20,
        "file_limit_mb": 2,
        "support_level": "community"
    }
