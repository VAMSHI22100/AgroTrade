from flask import Blueprint

from controllers.auth_controller import google_login_user, login_user, register_user

auth_bp = Blueprint("auth_bp", __name__)

auth_bp.route("/register", methods=["POST"])(register_user)
auth_bp.route("/login", methods=["POST"])(login_user)
auth_bp.route("/google-login", methods=["POST"])(google_login_user)
