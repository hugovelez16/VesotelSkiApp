import os
import secrets
import hmac
import hashlib
import requests
import base64
from typing import Optional, Dict, Any

class ShopifyService:
    def __init__(self):
        self.shop_url = os.getenv("SHOPIFY_STORE_URL")
        self.access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
        self.api_version = "2024-01" # Keep updated

    def get_headers(self) -> Dict[str, str]:
        return {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json"
        }

    def get_base_url(self) -> str:
        # cleanup url if needed
        url = self.shop_url.replace("https://", "").replace("http://", "").strip("/")
        return f"https://{url}/admin/api/{self.api_version}"

    def get_orders(self, limit: int = 10) -> Dict[str, Any]:
        """
        Fetch recent orders from Shopify
        """
        if not self.shop_url or not self.access_token:
            print("Shopify credentials not configured")
            return {"orders": []}

        try:
            url = f"{self.get_base_url()}/orders.json?status=any&limit={limit}"
            response = requests.get(url, headers=self.get_headers())
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching Shopify orders: {e}")
            return {"orders": [], "error": str(e)}

    def verify_webhook(self, data: bytes, hmac_header: str) -> bool:
        """
        Verify that a webhook request actually came from Shopify.
        """
        secret = os.getenv("SHOPIFY_WEBHOOK_SECRET")
        if not secret:
            print("SHOPIFY_WEBHOOK_SECRET not set, cannot verify webhook")
            return False

        digest = hmac.new(
            secret.encode('utf-8'),
            data,
            hashlib.sha256
        ).digest()
        computed_hmac = base64.b64encode(digest).decode('utf-8')

        return hmac.compare_digest(computed_hmac, hmac_header)

