# app/integrations/connectors/base.py
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import pandas as pd

class DataConnector(ABC):
    """Base class for all data connectors"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.connection = None

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the data source"""
        pass

    @abstractmethod
    async def disconnect(self) -> bool:
        """Close the connection"""
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        """Test if the connection is valid"""
        pass

    @abstractmethod
    async def get_schema(self) -> Dict[str, Any]:
        """Get the schema of available data"""
        pass

    @abstractmethod
    async def query(self, query: str, params: Optional[Dict] = None) -> pd.DataFrame:
        """Execute a query and return results as DataFrame"""
        pass
# app/integrations/connectors/salesforce.py
from simple_salesforce import Salesforce
from .base import DataConnector

class SalesforceConnector(DataConnector):
    async def connect(self):
        try:
            self.connection = Salesforce(
                username=self.config['username'],
                password=self.config['password'],
                security_token=self.config['security_token']
            )
            return True
        except Exception as e:
            print(f"Error connecting to Salesforce: {e}")
            return False

    async def query(self, query: str, params: Optional[Dict] = None) -> pd.DataFrame:
        results = self.connection.query_all(query)
        return pd.DataFrame(results['records'])

# app/integrations/connectors/hubspot.py
import hubspot
from .base import DataConnector

class HubspotConnector(DataConnector):
    async def connect(self):
        try:
            self.connection = hubspot.Client.create(
                access_token=self.config['access_token']
            )
            return True
        except Exception as e:
            print(f"Error connecting to Hubspot: {e}")
            return False

    async def query(self, query: str, params: Optional[Dict] = None) -> pd.DataFrame:
        if params and 'object_type' in params:
            results = self.connection.crm.objects.basic_api.get_page(
                object_type=params['object_type']
            )
            return pd.DataFrame(results.results)
        return pd.DataFrame()

# app/integrations/connectors/stripe.py
import stripe
from .base import DataConnector
from ...core.config import settings

class StripeConnector(DataConnector):
    async def connect(self):
        try:
            # Use the secret key from settings instead of config
            stripe.api_key = settings.STRIPE_SECRET_KEY
            self.connection = stripe
            return True
        except Exception as e:
            print(f"Error connecting to Stripe: {e}")
            return False

    async def query(self, query: str, params: Optional[Dict] = None) -> pd.DataFrame:
        if params and 'object_type' in params:
            results = self.connection.api_resources.search(
                object=params['object_type'],
                query=query
            )
            return pd.DataFrame(results.data)
        return pd.DataFrame()
