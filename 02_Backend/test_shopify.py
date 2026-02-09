from shopify_service import ShopifyService
import os

# Load env vars manually for script if dotenv not autoloaded (though service uses os.getenv)
# from dotenv import load_dotenv
# load_dotenv()

def test_connection():
    print("Testing Shopify Connection...")
    service = ShopifyService()
    
    print(f"Store: {service.shop_url}")
    print(f"Token: {service.access_token[:5]}... (Redacted)")
    
    # Try to fetch orders
    result = service.get_orders(limit=1)
    
    if "error" in result:
        print(f"❌ FAILED: {result['error']}")
    else:
        print("✅ SUCCESS: Connection established.")
        print(f"Orders found: {len(result.get('orders', []))}")
        if result.get('orders'):
             print(f"Sample Order ID: {result['orders'][0]['id']}")

if __name__ == "__main__":
    test_connection()
