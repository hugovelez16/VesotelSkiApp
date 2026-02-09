from fastapi import APIRouter, Header, Request, HTTPException, Depends
from shopify_service import ShopifyService
import models, crud
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/webhooks/shopify", tags=["shopify"])
shopify_service = ShopifyService()

@router.post("/orders/create")
async def handle_order_create(
    request: Request,
    x_shopify_hmac_sha256: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Receives 'orders/create' webhook from Shopify.
    """
    if not x_shopify_hmac_sha256:
         raise HTTPException(status_code=401, detail="Header missing")

    body_bytes = await request.body()
    
    # Verify HMAC
    if not shopify_service.verify_webhook(body_bytes, x_shopify_hmac_sha256):
         print("ERROR: Invalid Shopify verification signature")
         raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    
    # Process Order
    # For now, just print the id and total_price to verify connectivity
    order_id = payload.get("id")
    total_price = payload.get("total_price")
    currency = payload.get("currency")
    
    print(f"SHOPIFY WEBHOOK: New Order Received! ID: {order_id}, Total: {total_price} {currency}")
    
    # Future: Create WorkLog based on line items or assign to user?
    
    return {"status": "received"}
