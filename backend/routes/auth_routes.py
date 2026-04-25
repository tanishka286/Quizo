from flask import Blueprint, jsonify, request
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError, AuthError

from config.supabase_client import make_supabase_client

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _session_payload(session):
    if session is None:
        return None
    return session.model_dump(mode="json")


def _user_payload(user):
    if user is None:
        return None
    return user.model_dump(mode="json")


def _auth_error_response(exc: AuthError):
    status = getattr(exc, "status", 400)
    body = {
        "error": exc.message,
        "code": getattr(exc, "code", None),
    }
    if isinstance(exc, AuthApiError):
        body["name"] = exc.name
    return jsonify(body), status


@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    email, password = data.get("email"), data.get("password")
    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify(error="email and password must be strings"), 400
    if not email.strip() or not password:
        return jsonify(error="email and password are required"), 400

    full_name = ""
    if "full_name" in data:
        fn = data.get("full_name")
        if fn is not None and not isinstance(fn, str):
            return jsonify(error="full_name must be a string"), 400
        full_name = (fn or "").strip()

    role = data.get("role", "student")
    if role is None:
        role = "student"
    if not isinstance(role, str):
        return jsonify(error="role must be a string"), 400
    role = role.strip().lower() or "student"
    if role not in {"student", "teacher"}:
        return jsonify(error="role must be 'student' or 'teacher'"), 400

    try:
        client = make_supabase_client()
        result = client.auth.sign_up({"email": email.strip(), "password": password})
    except AuthError as e:
        return _auth_error_response(e)
    except Exception as e:
        return jsonify(error="unexpected_error", detail=str(e)), 500

    if result.user is None:
        return jsonify(error="signup_did_not_return_user"), 502

    try:
        client.table("users").insert(
            {
                "id": result.user.id,
                "full_name": full_name,
                "role": role,
            }
        ).execute()
    except APIError as e:
        return jsonify(
            error="profile_insert_failed",
            message=e.message,
        ), 400

    return (
        jsonify(
            user=_user_payload(result.user),
            session=_session_payload(result.session),
        ),
        201,
    )


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email, password = data.get("email"), data.get("password")
    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify(error="email and password must be strings"), 400
    if not email.strip() or not password:
        return jsonify(error="email and password are required"), 400

    try:
        client = make_supabase_client()
        result = client.auth.sign_in_with_password(
            {"email": email.strip(), "password": password}
        )
    except AuthError as e:
        return _auth_error_response(e)
    except Exception as e:
        return jsonify(error="unexpected_error", detail=str(e)), 500

    if result.session is None:
        return jsonify(error="no_session", message="Login did not return a session"), 401

    return jsonify(
        session=_session_payload(result.session),
        user=_user_payload(result.user),
    )


@auth_bp.get("/me")
def me():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify(error="unauthorized", message="Missing bearer token"), 401

    access_token = auth_header.replace("Bearer ", "", 1).strip()
    if not access_token:
        return jsonify(error="unauthorized", message="Invalid bearer token"), 401

    try:
        client = make_supabase_client(access_token=access_token)
        user_response = client.auth.get_user(access_token)
    except AuthError as e:
        return _auth_error_response(e)
    except Exception as e:
        return jsonify(error="unexpected_error", detail=str(e)), 500

    current_user = user_response.user if user_response else None
    if current_user is None:
        return jsonify(error="unauthorized", message="User not found"), 401

    try:
        profile_response = (
            client.table("users")
            .select("id,full_name,role")
            .eq("id", current_user.id)
            .limit(1)
            .execute()
        )
    except APIError as e:
        return jsonify(error="profile_fetch_failed", message=e.message), 400
    except Exception as e:
        return jsonify(error="unexpected_error", detail=str(e)), 500

    profile = profile_response.data[0] if profile_response.data else None
    if profile is None:
        return jsonify(error="forbidden", message="User profile not found"), 403

    return jsonify(profile=profile), 200


@auth_bp.post("/logout")
def logout():
    return jsonify(message="logged out")
