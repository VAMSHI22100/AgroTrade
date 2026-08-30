import bcrypt
import os
from flask import jsonify, request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from models.user_model import (
    create_google_user,
    create_user,
    get_user_by_email,
    get_user_for_login,
    update_password,
    update_user_name,
)


def register_user():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    role = data.get("role", "buyer")

    if not name or not email or not password:
        return jsonify({"message": "name, email and password are required"}), 400

    if role not in ["buyer", "farmer"]:
        return jsonify({"message": "role must be buyer or farmer"}), 400

    try:
        create_user(name, email, password, role)
        return jsonify({"message": "User registered"}), 201
    except Exception as exc:
        return jsonify({"message": "Registration failed", "error": str(exc)}), 500


def login_user():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "email and password are required"}), 400

    try:
        user = get_user_for_login(email)
        if not user:
            return jsonify({"message": "Invalid credentials"}), 401

        stored_password = user[3]
        if isinstance(stored_password, bytes):
            stored_password_text = stored_password.decode("utf-8", errors="ignore")
        else:
            stored_password_text = str(stored_password)

        is_bcrypt_hash = stored_password_text.startswith(("$2a$", "$2b$", "$2y$"))
        if is_bcrypt_hash:
            password_matches = bcrypt.checkpw(
                password.encode("utf-8"), stored_password_text.encode("utf-8")
            )
        else:
            password_matches = password == stored_password_text
            if password_matches:
                update_password(user[0], password)

        if password_matches:
            return jsonify(
                {
                    "message": "Login success",
                    "user_id": user[0],
                    "name": user[1],
                    "role": user[4],
                }
            )

        return jsonify({"message": "Invalid credentials"}), 401
    except Exception as exc:
        return jsonify({"message": "Login failed", "error": str(exc)}), 500


def google_login_user():
    data = request.get_json(silent=True) or {}
    credential = data.get("credential")
    requested_role = data.get("role", "buyer")

    if not credential:
        return jsonify({"message": "Google credential is required"}), 400

    if requested_role not in ["buyer", "farmer"]:
        return jsonify({"message": "role must be buyer or farmer"}), 400

    try:
        audience = os.getenv("GOOGLE_CLIENT_ID") or None
        token_info = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            audience,
        )

        email = (token_info.get("email") or "").strip().lower()
        name = (token_info.get("name") or token_info.get("given_name") or "").strip()
        email_verified = bool(token_info.get("email_verified", False))

        if not email or not email_verified:
            return jsonify({"message": "Invalid Google account email"}), 401

        if not name:
            name = email.split("@")[0]

        existing_user = get_user_by_email(email)

        if existing_user:
            user_id = existing_user[0]
            user_name = existing_user[1] or name
            user_role = existing_user[3] or requested_role
            if not existing_user[1] and name:
                update_user_name(user_id, name)
        else:
            user_id = create_google_user(name, email, requested_role)
            user_name = name
            user_role = requested_role

        return jsonify(
            {
                "message": "Google login success",
                "user_id": user_id,
                "name": user_name,
                "role": user_role,
                "email": email,
            }
        )
    except ValueError:
        return jsonify({"message": "Invalid Google token"}), 401
    except Exception as exc:
        return jsonify({"message": "Google login failed", "error": str(exc)}), 500
