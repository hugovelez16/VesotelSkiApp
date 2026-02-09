from shopify_service import ShopifyService
import hmac
import hashlib
import base64

def test_webhook_verification():
    print("Testing Webhook Verification...")
    
    secret = "hush"
    data = b'{"test": "data"}'
    
    # Calculate expected HMAC
    digest = hmac.new(secret.encode('utf-8'), data, hashlib.sha256).digest()
    computed_hmac = base64.b64encode(digest).decode('utf-8')
    
    # Mock environment variable for the service
    import os
    os.environ["SHOPIFY_WEBHOOK_SECRET"] = secret
    
    service = ShopifyService()
    
    # Test Valid
    is_valid = service.verify_webhook(data, computed_hmac)
    if is_valid:
        print("✅ Valid signature accepted")
    else:
        print("❌ Valid signature REJECTED")

    # Test Invalid
    is_invalid = service.verify_webhook(data, "invalid_hmac")
    if not is_invalid:
        print("✅ Invalid signature rejected")
    else:
        print("❌ Invalid signature ACCEPTED")

if __name__ == "__main__":
    test_webhook_verification()
