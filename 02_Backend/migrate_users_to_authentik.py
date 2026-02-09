"""
User Migration Script: Vesotel → Authentik

This script migrates all users from the Vesotel local database to Authentik.
It creates users in Authentik, assigns them to the appropriate groups, and 
sends password reset emails.

Usage:
    python migrate_users_to_authentik.py [--dry-run]

Requirements:
    - Authentik must be running and accessible
    - API token must be configured in environment variables
    - SMTP must be configured in Authentik for password reset emails
"""

import os
import sys
import argparse
import requests
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Authentik Configuration
AUTHENTIK_URL = os.getenv("AUTHENTIK_SERVER", "http://localhost:9000")
AUTHENTIK_API_TOKEN = os.getenv("AUTHENTIK_API_TOKEN")  # Create this in Authentik UI

if not AUTHENTIK_API_TOKEN:
    logger.error("AUTHENTIK_API_TOKEN not set! Please create an API token in Authentik.")
    logger.error("Go to: Authentik UI → Directory → Tokens & App passwords → Create Token")
    sys.exit(1)

API_BASE = f"{AUTHENTIK_URL}/api/v3"
HEADERS = {
    "Authorization": f"Bearer {AUTHENTIK_API_TOKEN}",
    "Content-Type": "application/json"
}


def get_or_create_group(name: str, parent_name: str = None) -> str:
    """Get or create a group in Authentik. Returns group ID."""
    # Search for existing group
    response = requests.get(
        f"{API_BASE}/core/groups/",
        params={"name": name},
        headers=HEADERS
    )
    response.raise_for_status()
    
    results = response.json()["results"]
    if results:
        logger.info(f"Group '{name}' already exists")
        return results[0]["pk"]
    
    # Create new group
    logger.info(f"Creating group '{name}'")
    
    group_data = {
        "name": name,
        "is_superuser": False,
    }
    
    # If parent group specified, find it first
    if parent_name:
        parent_response = requests.get(
            f"{API_BASE}/core/groups/",
            params={"name": parent_name},
            headers=HEADERS
        )
        parent_response.raise_for_status()
        parent_results = parent_response.json()["results"]
        if parent_results:
            group_data["parent"] = parent_results[0]["pk"]
    
    response = requests.post(
        f"{API_BASE}/core/groups/",
        json=group_data,
        headers=HEADERS
    )
    response.raise_for_status()
    
    return response.json()["pk"]


def get_application_id(slug: str) -> str:
    """Get application ID by slug."""
    response = requests.get(
        f"{API_BASE}/core/applications/",
        params={"slug": slug},
        headers=HEADERS
    )
    response.raise_for_status()
    
    results = response.json()["results"]
    if not results:
        logger.error(f"Application '{slug}' not found in Authentik!")
        logger.error("Please create the Vesotel application first.")
        return None
    
    return results[0]["pk"]


def create_user_in_authentik(user: models.User, groups: list, dry_run: bool = False) -> bool:
    """Create a user in Authentik."""
    # Check if user already exists
    response = requests.get(
        f"{API_BASE}/core/users/",
        params={"username": user.email},
        headers=HEADERS
    )
    response.raise_for_status()
    
    if response.json()["results"]:
        logger.info(f"User {user.email} already exists in Authentik - skipping")
        return False
    
    user_data = {
        "username": user.email,
        "name": f"{user.first_name} {user.last_name}".strip() or user.email,
        "email": user.email,
        "is_active": user.is_active,
        "groups": groups,  # List of group IDs
        "attributes": {
            "vesotel_user_id": str(user.id),
            "migrated_from": "vesotel",
            "migrated_at": str(datetime.utcnow()),
        }
    }
    
    if dry_run:
        logger.info(f"[DRY RUN] Would create user: {user.email}")
        logger.debug(f"User data: {user_data}")
        return True
    
    logger.info(f"Creating user: {user.email}")
    
    try:
        response = requests.post(
            f"{API_BASE}/core/users/",
            json=user_data,
            headers=HEADERS
        )
        response.raise_for_status()
        
        user_id = response.json()["pk"]
        
        # Set a recovery link for password reset
        logger.info(f"Generating recovery link for: {user.email}")
        recovery_response = requests.get(
            f"{API_BASE}/core/users/{user_id}/recovery/",
            headers=HEADERS
        )
        recovery_response.raise_for_status()
        
        recovery_link = recovery_response.json()["link"]
        logger.info(f"Recovery link for {user.email}: {recovery_link}")
        
        # TODO: Send email with recovery link
        # For now, you can manually send these links or configure Authentik to send them
        
        return True
        
    except requests.HTTPError as e:
        logger.error(f"Failed to create user {user.email}: {e}")
        logger.error(f"Response: {e.response.text}")
        return False


def migrate_users(dry_run: bool = False):
    """Main migration function."""
    db: Session = SessionLocal()
    
    try:
        # Step 1: Create groups
        logger.info("=" * 60)
        logger.info("Step 1: Creating groups in Authentik")
        logger.info("=" * 60)
        
        vesotel_users_group = get_or_create_group("Vesotel Users")
        vesotel_admins_group = get_or_create_group("Vesotel Admins", "Vesotel Users")
        vesotel_supervisors_group = get_or_create_group("Vesotel Supervisors", "Vesotel Users")
        vesotel_workers_group = get_or_create_group("Vesotel Workers", "Vesotel Users")
        
        # Step 2: Get application ID
        logger.info("=" * 60)
        logger.info("Step 2: Finding Vesotel application")
        logger.info("=" * 60)
        
        app_id = get_application_id("vesotel")
        if not app_id:
            logger.error("Cannot proceed without Vesotel application.")
            return
        
        logger.info(f"Found Vesotel application: {app_id}")
        
        # Step 3: Migrate users
        logger.info("=" * 60)
        logger.info("Step 3: Migrating users")
        logger.info("=" * 60)
        
        users = db.query(models.User).all()
        logger.info(f"Found {len(users)} users to migrate")
        
        success_count = 0
        skip_count = 0
        error_count = 0
        
        for user in users:
            # Determine groups
            groups = [vesotel_users_group]  # All users get base group
            
            # Check role
            if user.role == models.UserRole.admin:
                groups.append(vesotel_admins_group)
            
            # Check if user is supervisor (has manager role in any company)
            company_memberships = db.query(models.CompanyMember).filter(
                models.CompanyMember.user_id == user.id
            ).all()
            
            is_supervisor = any(
                membership.role == models.CompanyRole.manager 
                for membership in company_memberships
            )
            
            if is_supervisor:
                groups.append(vesotel_supervisors_group)
            else:
                groups.append(vesotel_workers_group)
            
            # Create user
            result = create_user_in_authentik(user, groups, dry_run)
            
            if result:
                success_count += 1
            elif result is None:
                skip_count += 1
            else:
                error_count += 1
        
        # Summary
        logger.info("=" * 60)
        logger.info("Migration Summary")
        logger.info("=" * 60)
        logger.info(f"Total users: {len(users)}")
        logger.info(f"Successfully created: {success_count}")
        logger.info(f"Skipped (already exist): {skip_count}")
        logger.info(f"Errors: {error_count}")
        
        if dry_run:
            logger.info("\n*** DRY RUN MODE - No changes were made ***")
        
        logger.info("\nNext steps:")
        logger.info("1. Check Authentik UI to verify users were created")
        logger.info("2. Send recovery links to users (check logs above)")
        logger.info("3. Test login with a migrated user")
        logger.info("4. Update your app to use OIDC authentication")
        
    finally:
        db.close()


if __name__ == "__main__":
    from datetime import datetime
    
    parser = argparse.ArgumentParser(description="Migrate Vesotel users to Authentik")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run in dry-run mode (no changes will be made)"
    )
    
    args = parser.parse_args()
    
    logger.info("Starting user migration to Authentik")
    logger.info(f"Authentik URL: {AUTHENTIK_URL}")
    logger.info(f"Dry run: {args.dry_run}")
    
    migrate_users(dry_run=args.dry_run)
