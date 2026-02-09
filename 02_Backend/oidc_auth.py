"""
OIDC Authentication Module for Vesotel App

This module provides OAuth2/OpenID Connect authentication using Authentik as the identity provider.
It replaces the previous local authentication system with centralized SSO.
"""

from fastapi import Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
import httpx
import os
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

# Authentik Configuration from environment
AUTHENTIK_SERVER = os.getenv("AUTHENTIK_SERVER", "http://authentik_server:9000")
AUTHENTIK_CLIENT_ID = os.getenv("AUTHENTIK_CLIENT_ID", "vesotel-app")
AUTHENTIK_CLIENT_SECRET = os.getenv("AUTHENTIK_CLIENT_SECRET")
AUTHENTIK_REDIRECT_URI = os.getenv("AUTHENTIK_REDIRECT_URI", "http://localhost:4400/auth/callback")
AUTHENTIK_ISSUER = os.getenv("AUTHENTIK_ISSUER", f"{AUTHENTIK_SERVER}/application/o/vesotel/")

# OAuth2 endpoints
AUTHORIZATION_ENDPOINT = f"{AUTHENTIK_ISSUER}authorize"
TOKEN_ENDPOINT = f"{AUTHENTIK_SERVER}/application/o/token/"
USERINFO_ENDPOINT = f"{AUTHENTIK_SERVER}/application/o/userinfo/"
LOGOUT_ENDPOINT = f"{AUTHENTIK_ISSUER}end-session/"

if not AUTHENTIK_CLIENT_SECRET:
    logger.warning("AUTHENTIK_CLIENT_SECRET not set! OIDC authentication will not work.")


async def get_current_user(request: Request) -> Dict:
    """
    Dependency to get the current authenticated user from the session.
    
    Raises HTTPException(401) if user is not authenticated.
    """
    user = request.session.get("user")
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_optional_user(request: Request) -> Optional[Dict]:
    """
    Dependency to get the current user if authenticated, otherwise None.
    Useful for endpoints that work differently for logged-in vs anonymous users.
    """
    return request.session.get("user")


def is_admin(user: Dict) -> bool:
    """Check if user has admin role based on groups from Authentik."""
    groups = user.get("groups", [])
    return "Admins" in groups or "Vesotel Admins" in groups


def is_supervisor(user: Dict) -> bool:
    """Check if user has supervisor role."""
    groups = user.get("groups", [])
    return "Vesotel Supervisors" in groups or is_admin(user)


async def get_admin_user(request: Request) -> Dict:
    """Dependency that requires admin role."""
    user = await get_current_user(request)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def get_supervisor_user(request: Request) -> Dict:
    """Dependency that requires supervisor or admin role."""
    user = await get_current_user(request)
    if not (is_supervisor(user) or is_admin(user)):
        raise HTTPException(status_code=403, detail="Supervisor or admin access required")
    return user


def init_session_middleware(app, secret_key: str):
    """
    Initialize session middleware for the FastAPI app.
    Must be called before using session-based authentication.
    """
    app.add_middleware(SessionMiddleware, secret_key=secret_key)


def get_login_url(request: Request, state: Optional[str] = None) -> str:
    """
    Generate the OAuth2 authorization URL for user login.
    
    Args:
        request: FastAPI request object
        state: Optional state parameter for CSRF protection
    
    Returns:
        Full URL to redirect user to for authentication
    """
    import urllib.parse
    
    params = {
        "client_id": AUTHENTIK_CLIENT_ID,
        "response_type": "code",
        "scope": "openid profile email",
        "redirect_uri": AUTHENTIK_REDIRECT_URI,
    }
    
    if state:
        params["state"] = state
    
    query_string = urllib.parse.urlencode(params)
    return f"{AUTHORIZATION_ENDPOINT}?{query_string}"


async def exchange_code_for_token(code: str) -> Dict:
    """
    Exchange authorization code for access token.
    
    Args:
        code: Authorization code received from callback
    
    Returns:
        Token response containing access_token, id_token, etc.
    
    Raises:
        HTTPException if token exchange fails
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                TOKEN_ENDPOINT,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": AUTHENTIK_REDIRECT_URI,
                    "client_id": AUTHENTIK_CLIENT_ID,
                    "client_secret": AUTHENTIK_CLIENT_SECRET,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Token exchange failed: {e}")
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code")


async def get_user_info(access_token: str) -> Dict:
    """
    Get user information from Authentik using access token.
    
    Args:
        access_token: OAuth2 access token
    
    Returns:
        User information dict containing email, name, groups, etc.
    
    Raises:
        HTTPException if request fails
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                USERINFO_ENDPOINT,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to get user info: {e}")
            raise HTTPException(status_code=400, detail="Failed to get user information")


async def refresh_access_token(refresh_token: str) -> Dict:
    """
    Refresh an expired access token.
    
    Args:
        refresh_token: OAuth2 refresh token
    
    Returns:
        New token response
    
    Raises:
        HTTPException if refresh fails
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                TOKEN_ENDPOINT,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": AUTHENTIK_CLIENT_ID,
                    "client_secret": AUTHENTIK_CLIENT_SECRET,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Token refresh failed: {e}")
            raise HTTPException(status_code=401, detail="Failed to refresh token")


def get_logout_url(id_token: Optional[str] = None, redirect_url: Optional[str] = None) -> str:
    """
    Generate logout URL to end the Authentik session.
    
    Args:
        id_token: Optional ID token for logout
        redirect_url: Where to redirect after logout
    
    Returns:
        Logout URL
    """
    import urllib.parse
    
    params = {}
    if id_token:
        params["id_token_hint"] = id_token
    if redirect_url:
        params["post_logout_redirect_uri"] = redirect_url
    
    if params:
        query_string = urllib.parse.urlencode(params)
        return f"{LOGOUT_ENDPOINT}?{query_string}"
    return LOGOUT_ENDPOINT


# Example usage in main.py:
# 
# from oidc_auth import (
#     init_session_middleware, 
#     get_login_url, 
#     exchange_code_for_token,
#     get_user_info,
#     get_current_user,
#     get_admin_user,
#     get_logout_url
# )
#
# # Initialize session middleware
# init_session_middleware(app, settings.SECRET_KEY)
#
# @app.get("/login")
# async def login(request: Request):
#     login_url = get_login_url(request)
#     return RedirectResponse(login_url)
#
# @app.get("/auth/callback")
# async def auth_callback(request: Request, code: str):
#     # Exchange code for token
#     tokens = await exchange_code_for_token(code)
#     
#     # Get user info
#     user_info = await get_user_info(tokens["access_token"])
#     
#     # Store in session
#     request.session["user"] = user_info
#     request.session["access_token"] = tokens["access_token"]
#     request.session["refresh_token"] = tokens.get("refresh_token")
#     request.session["id_token"] = tokens.get("id_token")
#     
#     return RedirectResponse("/")
#
# @app.post("/logout")
# async def logout(request: Request):
#     id_token = request.session.get("id_token")
#     request.session.clear()
#     logout_url = get_logout_url(id_token, redirect_url="http://localhost:3000")
#     return RedirectResponse(logout_url)
#
# @app.get("/api/me")
# async def get_me(user: dict = Depends(get_current_user)):
#     return user
#
# @app.get("/api/admin-only")
# async def admin_endpoint(user: dict = Depends(get_admin_user)):
#     return {"message": "Welcome, admin!"}
