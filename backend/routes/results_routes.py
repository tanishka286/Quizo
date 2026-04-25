from flask import Blueprint, jsonify, request
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthError

from config.supabase_client import make_supabase_client

results_bp = Blueprint("results", __name__, url_prefix="/results")


@results_bp.get("/my")
def get_my_results():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify(error="unauthorized", message="Missing bearer token"), 401

    access_token = auth_header.replace("Bearer ", "", 1).strip()
    if not access_token:
        return jsonify(error="unauthorized", message="Invalid bearer token"), 401

    try:
        client = make_supabase_client(access_token=access_token)
        user_response = client.auth.get_user(access_token)
    except AuthError as exc:
        return jsonify(error="unauthorized", message=exc.message), 401
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    current_user = user_response.user if user_response else None
    if current_user is None:
        return jsonify(error="unauthorized", message="User not found"), 401

    try:
        role_response = (
            client.table("users")
            .select("role")
            .eq("id", current_user.id)
            .limit(1)
            .execute()
        )
        role_row = role_response.data[0] if role_response.data else None
        if not role_row or role_row.get("role") != "student":
            return jsonify(error="forbidden", message="Only students can view my results"), 403

        results_response = (
            client.table("results")
            .select("quiz_id,score_percent,correct_count,total_questions,submitted_at")
            .eq("student_id", current_user.id)
            .order("submitted_at", desc=True)
            .execute()
        )
        rows = results_response.data or []
    except APIError as exc:
        return jsonify(error="results_fetch_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(results=rows), 200
