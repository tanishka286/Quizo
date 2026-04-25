from flask import Blueprint, jsonify, request
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthError

from config.supabase_client import make_supabase_client

question_bp = Blueprint("question", __name__, url_prefix="/question")


def _get_teacher_context(access_token):
    client = make_supabase_client(access_token=access_token)
    user_response = client.auth.get_user(access_token)
    current_user = user_response.user if user_response else None
    if current_user is None:
        return None, None, (jsonify(error="unauthorized", message="User not found"), 401)

    role_response = (
        client.table("users").select("role").eq("id", current_user.id).limit(1).execute()
    )
    role_row = role_response.data[0] if role_response.data else None
    if not role_row or role_row.get("role") != "teacher":
        return None, None, (
            jsonify(error="forbidden", message="Only teachers can manage questions"),
            403,
        )

    return client, current_user, None


@question_bp.put("/<question_id>")
def update_question(question_id):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify(error="unauthorized", message="Missing bearer token"), 401

    access_token = auth_header.replace("Bearer ", "", 1).strip()
    if not access_token:
        return jsonify(error="unauthorized", message="Invalid bearer token"), 401

    payload = request.get_json(silent=True) or {}
    prompt = payload.get("prompt")
    choices = payload.get("choices")
    correct_option = payload.get("correct_option")

    if not isinstance(prompt, str) or not prompt.strip():
        return jsonify(error="invalid_input", message="prompt must be a non-empty string"), 400
    if not isinstance(choices, list) or len(choices) < 2:
        return jsonify(error="invalid_input", message="choices must be an array with at least 2 items"), 400
    if not all(isinstance(choice, str) and choice.strip() for choice in choices):
        return jsonify(error="invalid_input", message="choices must contain non-empty strings"), 400
    if isinstance(correct_option, bool) or not isinstance(correct_option, int):
        return jsonify(error="invalid_input", message="correct_option must be an integer"), 400
    if correct_option < 0 or correct_option >= len(choices):
        return jsonify(error="invalid_input", message="correct_option index is out of range"), 400

    stripped_choices = [choice.strip() for choice in choices]

    try:
        client, current_user, error_response = _get_teacher_context(access_token)
        if error_response:
            return error_response

        question_response = (
            client.table("questions")
            .select("id,quiz_id")
            .eq("id", question_id)
            .limit(1)
            .execute()
        )
        question_row = question_response.data[0] if question_response.data else None
        if not question_row:
            return jsonify(error="not_found", message="Question not found"), 404

        quiz_response = (
            client.table("quizzes")
            .select("id")
            .eq("id", question_row["quiz_id"])
            .eq("teacher_id", current_user.id)
            .limit(1)
            .execute()
        )
        if not quiz_response.data:
            return jsonify(error="forbidden", message="Question does not belong to your quiz"), 403

        update_response = (
            client.table("questions")
            .update(
                {
                    "prompt": prompt.strip(),
                    "choices": stripped_choices,
                    "correct_option": correct_option,
                }
            )
            .eq("id", question_id)
            .execute()
        )
        updated_question = update_response.data[0] if update_response.data else None
    except AuthError as exc:
        return jsonify(error="unauthorized", message=exc.message), 401
    except APIError as exc:
        return jsonify(error="question_update_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(message="question updated", question=updated_question), 200


@question_bp.delete("/<question_id>")
def delete_question(question_id):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify(error="unauthorized", message="Missing bearer token"), 401

    access_token = auth_header.replace("Bearer ", "", 1).strip()
    if not access_token:
        return jsonify(error="unauthorized", message="Invalid bearer token"), 401

    try:
        client, current_user, error_response = _get_teacher_context(access_token)
        if error_response:
            return error_response

        question_response = (
            client.table("questions")
            .select("id,quiz_id")
            .eq("id", question_id)
            .limit(1)
            .execute()
        )
        question_row = question_response.data[0] if question_response.data else None
        if not question_row:
            return jsonify(error="not_found", message="Question not found"), 404

        quiz_response = (
            client.table("quizzes")
            .select("id")
            .eq("id", question_row["quiz_id"])
            .eq("teacher_id", current_user.id)
            .limit(1)
            .execute()
        )
        if not quiz_response.data:
            return jsonify(error="forbidden", message="Question does not belong to your quiz"), 403

        client.table("responses").delete().eq("question_id", question_id).execute()
        client.table("questions").delete().eq("id", question_id).execute()
    except AuthError as exc:
        return jsonify(error="unauthorized", message=exc.message), 401
    except APIError as exc:
        return jsonify(error="question_delete_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(message="question deleted"), 200
