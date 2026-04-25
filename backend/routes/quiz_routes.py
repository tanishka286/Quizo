from flask import Blueprint, jsonify, request
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthError

from config.supabase_client import make_supabase_client

quiz_bp = Blueprint("quiz", __name__, url_prefix="/quiz")


@quiz_bp.post("/create")
def create_quiz():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify(error="unauthorized", message="Missing bearer token"), 401

    access_token = auth_header.replace("Bearer ", "", 1).strip()
    if not access_token:
        return jsonify(error="unauthorized", message="Invalid bearer token"), 401

    payload = request.get_json(silent=True) or {}
    title = payload.get("title")
    duration_seconds = payload.get("duration_seconds")
    shuffle_questions = payload.get("shuffle_questions", False)

    if not isinstance(title, str) or not title.strip():
        return jsonify(error="invalid_input", message="title must be a non-empty string"), 400

    if isinstance(duration_seconds, bool) or not isinstance(duration_seconds, int):
        return jsonify(error="invalid_input", message="duration_seconds must be an integer"), 400
    if duration_seconds <= 0:
        return jsonify(error="invalid_input", message="duration_seconds must be > 0"), 400

    if not isinstance(shuffle_questions, bool):
        return jsonify(error="invalid_input", message="shuffle_questions must be boolean"), 400

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
        if not role_row:
            return jsonify(error="forbidden", message="User profile not found"), 403
        if role_row.get("role") != "teacher":
            return jsonify(error="forbidden", message="Only teachers can create quizzes"), 403

        quiz_payload = {
            "teacher_id": current_user.id,
            "title": title.strip(),
            "duration_seconds": duration_seconds,
            "shuffle_questions": shuffle_questions,
        }

        quiz_insert_response = client.table("quizzes").insert(quiz_payload).execute()
        quiz_row = quiz_insert_response.data[0] if quiz_insert_response.data else quiz_payload

    except APIError as exc:
        return jsonify(error="quiz_creation_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(message="quiz created", quiz=quiz_row), 201


@quiz_bp.get("/my")
def get_my_quizzes():
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
        if not role_row or role_row.get("role") != "teacher":
            return jsonify(error="forbidden", message="Only teachers can view my quizzes"), 403

        quizzes_response = (
            client.table("quizzes")
            .select("id,title,duration_seconds,created_at")
            .eq("teacher_id", current_user.id)
            .order("created_at", desc=True)
            .execute()
        )
        quizzes = quizzes_response.data or []
        quiz_ids = [quiz.get("id") for quiz in quizzes if quiz.get("id")]
        counts_by_quiz = {}
        if quiz_ids:
            questions_response = (
                client.table("questions").select("quiz_id").in_("quiz_id", quiz_ids).execute()
            )
            for row in questions_response.data or []:
                qid = row.get("quiz_id")
                counts_by_quiz[qid] = counts_by_quiz.get(qid, 0) + 1

        for quiz in quizzes:
            quiz["question_count"] = counts_by_quiz.get(quiz.get("id"), 0)
    except APIError as exc:
        return jsonify(error="quiz_fetch_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(quizzes=quizzes), 200


@quiz_bp.get("/all")
def get_all_quizzes():
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
        if not role_row or role_row.get("role") not in {"student", "teacher"}:
            return jsonify(error="forbidden", message="Only authenticated users can view quizzes"), 403

        quizzes_response = (
            client.table("quizzes")
            .select("id,title,duration_seconds,created_at")
            .order("created_at", desc=True)
            .execute()
        )
    except APIError as exc:
        return jsonify(error="quiz_fetch_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(quizzes=quizzes_response.data or []), 200


@quiz_bp.put("/<quiz_id>")
def update_quiz(quiz_id):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify(error="unauthorized", message="Missing bearer token"), 401

    access_token = auth_header.replace("Bearer ", "", 1).strip()
    if not access_token:
        return jsonify(error="unauthorized", message="Invalid bearer token"), 401

    payload = request.get_json(silent=True) or {}
    title = payload.get("title")
    duration_seconds = payload.get("duration_seconds")
    shuffle_questions = payload.get("shuffle_questions")

    updates = {}
    if title is not None:
        if not isinstance(title, str) or not title.strip():
            return jsonify(error="invalid_input", message="title must be a non-empty string"), 400
        updates["title"] = title.strip()

    if duration_seconds is not None:
        if isinstance(duration_seconds, bool) or not isinstance(duration_seconds, int):
            return jsonify(error="invalid_input", message="duration_seconds must be an integer"), 400
        if duration_seconds <= 0:
            return jsonify(error="invalid_input", message="duration_seconds must be > 0"), 400
        updates["duration_seconds"] = duration_seconds

    if shuffle_questions is not None:
        if not isinstance(shuffle_questions, bool):
            return jsonify(error="invalid_input", message="shuffle_questions must be boolean"), 400
        updates["shuffle_questions"] = shuffle_questions

    if not updates:
        return jsonify(error="invalid_input", message="No valid fields to update"), 400

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
        if not role_row or role_row.get("role") != "teacher":
            return jsonify(error="forbidden", message="Only teachers can edit quizzes"), 403

        existing_quiz = (
            client.table("quizzes")
            .select("id")
            .eq("id", quiz_id)
            .eq("teacher_id", current_user.id)
            .limit(1)
            .execute()
        )
        if not existing_quiz.data:
            return jsonify(error="forbidden", message="Quiz not found or not owned by teacher"), 403

        update_response = (
            client.table("quizzes")
            .update(updates)
            .eq("id", quiz_id)
            .eq("teacher_id", current_user.id)
            .execute()
        )
        updated_quiz = update_response.data[0] if update_response.data else None
    except APIError as exc:
        return jsonify(error="quiz_update_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(message="quiz updated", quiz=updated_quiz), 200


@quiz_bp.delete("/<quiz_id>")
def delete_quiz(quiz_id):
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
        if not role_row or role_row.get("role") != "teacher":
            return jsonify(error="forbidden", message="Only teachers can delete quizzes"), 403

        existing_quiz = (
            client.table("quizzes")
            .select("id")
            .eq("id", quiz_id)
            .eq("teacher_id", current_user.id)
            .limit(1)
            .execute()
        )
        if not existing_quiz.data:
            return jsonify(error="forbidden", message="Quiz not found or not owned by teacher"), 403

        # Cleanup dependent records before quiz deletion to avoid FK violations.
        client.table("responses").delete().eq("quiz_id", quiz_id).execute()
        client.table("results").delete().eq("quiz_id", quiz_id).execute()
        client.table("questions").delete().eq("quiz_id", quiz_id).execute()
        client.table("quizzes").delete().eq("id", quiz_id).eq("teacher_id", current_user.id).execute()
    except APIError as exc:
        return jsonify(error="quiz_delete_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(message="quiz deleted"), 200


@quiz_bp.post("/<quiz_id>/question/add")
def add_question(quiz_id):
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
    stripped_choices = [choice.strip() for choice in choices]
    if any(not choice for choice in stripped_choices):
        return jsonify(error="invalid_input", message="choices must contain non-empty strings"), 400
    if isinstance(correct_option, bool) or not isinstance(correct_option, int):
        return jsonify(error="invalid_input", message="correct_option must be an integer"), 400
    if correct_option < 0 or correct_option >= len(choices):
        return jsonify(error="invalid_input", message="correct_option index is out of range"), 400

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
        if not role_row or role_row.get("role") != "teacher":
            return jsonify(error="forbidden", message="Only teachers can add questions"), 403

        quiz_response = (
            client.table("quizzes")
            .select("id")
            .eq("id", quiz_id)
            .eq("teacher_id", current_user.id)
            .limit(1)
            .execute()
        )
        quiz_row = quiz_response.data[0] if quiz_response.data else None
        if not quiz_row:
            return jsonify(error="forbidden", message="Quiz not found or not owned by teacher"), 403

        questions_count_response = (
            client.table("questions")
            .select("*", count="exact")
            .eq("quiz_id", quiz_id)
            .execute()
        )
        position = questions_count_response.count or 0

        question_payload = {
            "quiz_id": quiz_id,
            "prompt": prompt.strip(),
            "choices": stripped_choices,
            "correct_option": correct_option,
            "position": position,
        }
        insert_response = client.table("questions").insert(question_payload).execute()
        question_row = insert_response.data[0] if insert_response.data else question_payload

    except APIError as exc:
        return jsonify(error="question_add_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(message="question added", question=question_row), 201


@quiz_bp.get("/<quiz_id>/attempt")
def get_quiz_for_attempt(quiz_id):
    auth_header = request.headers.get("Authorization", "")
    access_token = auth_header.replace("Bearer ", "", 1).strip() if auth_header.startswith("Bearer ") else ""

    if not access_token:
        # Public preview mode for shared links (no auth): return quiz + question metadata.
        try:
            client = make_supabase_client()
            quiz_response = (
                client.table("quizzes")
                .select("id,title,duration_seconds")
                .eq("id", quiz_id)
                .limit(1)
                .execute()
            )
            quiz_row = quiz_response.data[0] if quiz_response.data else None
            if not quiz_row:
                return jsonify(error="not_found", message="Quiz not found"), 404

            questions_response = (
                client.table("questions")
                .select("id,prompt,choices,position")
                .eq("quiz_id", quiz_id)
                .order("position")
                .execute()
            )
            questions = questions_response.data or []
            if not questions:
                return jsonify(error="no_questions", message="Quiz has no questions"), 400
        except APIError as exc:
            return jsonify(error="quiz_fetch_failed", message=exc.message), 400
        except Exception as exc:
            return jsonify(error="unexpected_error", detail=str(exc)), 500

        return jsonify(quiz=quiz_row, questions=questions), 200

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
        if not role_row:
            return jsonify(error="forbidden", message="User profile not found"), 403

        role = role_row.get("role")
        if role not in {"student", "teacher"}:
            return jsonify(error="forbidden", message="Only students or teachers can access quiz"), 403

        quiz_query = client.table("quizzes").select("id,title,duration_seconds,teacher_id").eq(
            "id", quiz_id
        )
        if role == "teacher":
            quiz_query = quiz_query.eq("teacher_id", current_user.id)

        quiz_response = quiz_query.limit(1).execute()
        quiz_row = quiz_response.data[0] if quiz_response.data else None
        if not quiz_row:
            if role == "teacher":
                return jsonify(error="forbidden", message="Quiz not found or not owned by teacher"), 403
            return jsonify(error="not_found", message="Quiz not found"), 404

        question_fields = "id,prompt,choices,position"
        if role == "teacher":
            question_fields = "id,prompt,choices,correct_option,position"

        questions_response = (
            client.table("questions")
            .select(question_fields)
            .eq("quiz_id", quiz_id)
            .order("position")
            .execute()
        )
        questions = questions_response.data or []
        if not questions:
            return jsonify(error="no_questions", message="Quiz has no questions"), 400

    except APIError as exc:
        return jsonify(error="quiz_fetch_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    quiz_payload = {
        "id": quiz_row.get("id"),
        "title": quiz_row.get("title"),
        "duration_seconds": quiz_row.get("duration_seconds"),
    }

    return jsonify(quiz=quiz_payload, questions=questions), 200


@quiz_bp.post("/<quiz_id>/submit")
def submit_quiz(quiz_id):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify(error="unauthorized", message="Missing bearer token"), 401

    access_token = auth_header.replace("Bearer ", "", 1).strip()
    if not access_token:
        return jsonify(error="unauthorized", message="Invalid bearer token"), 401

    payload = request.get_json(silent=True) or {}
    answers = payload.get("answers")
    if not isinstance(answers, list) or not answers:
        return jsonify(error="invalid_input", message="answers must be a non-empty array"), 400

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
            return jsonify(error="forbidden", message="Only students can submit quizzes"), 403

        existing_result = (
            client.table("results")
            .select("id")
            .eq("student_id", current_user.id)
            .eq("quiz_id", quiz_id)
            .limit(1)
            .execute()
        )
        if existing_result.data:
            return jsonify(error="duplicate_submission", message="Quiz already submitted"), 409

        questions_response = (
            # Select only required fields to keep payload small and evaluation fast.
            client.table("questions")
            .select("id,choices,correct_option")
            .eq("quiz_id", quiz_id)
            .order("position")
            .execute()
        )
        question_rows = questions_response.data or []
        if not question_rows:
            return jsonify(error="invalid_input", message="Quiz has no questions"), 400

        questions_by_id = {q["id"]: q for q in question_rows}
        expected_ids = set(questions_by_id.keys())

        submitted_ids = set()
        responses_payload = []
        correct_count = 0

        for answer in answers:
            if not isinstance(answer, dict):
                return jsonify(error="invalid_input", message="Each answer must be an object"), 400

            question_id = answer.get("question_id")
            selected_option = answer.get("selected_option")

            if not isinstance(question_id, str) or not question_id.strip():
                return jsonify(error="invalid_input", message="question_id must be a non-empty string"), 400
            if isinstance(selected_option, bool) or not isinstance(selected_option, int):
                return jsonify(error="invalid_input", message="selected_option must be an integer"), 400
            if question_id in submitted_ids:
                return jsonify(error="invalid_input", message="Duplicate question_id in answers"), 400
            if question_id not in questions_by_id:
                return jsonify(error="invalid_input", message="Answer contains invalid question_id"), 400

            question_row = questions_by_id[question_id]
            options = question_row.get("choices") or []
            if not isinstance(options, list) or selected_option < 0 or selected_option >= len(options):
                return jsonify(error="invalid_input", message="selected_option out of range"), 400

            if selected_option == question_row.get("correct_option"):
                correct_count += 1

            submitted_ids.add(question_id)
            responses_payload.append(
                {
                    "student_id": current_user.id,
                    "quiz_id": quiz_id,
                    "question_id": question_id,
                    "selected_option": selected_option,
                }
            )

        if submitted_ids != expected_ids:
            return jsonify(error="invalid_input", message="answers must cover all quiz questions"), 400

        # In production, responses + results inserts should run inside one DB transaction for atomicity.
        client.table("responses").insert(responses_payload).execute()

        total_questions = len(question_rows)
        score_percent = round((correct_count / total_questions) * 100, 2)
        result_payload = {
            "student_id": current_user.id,
            "quiz_id": quiz_id,
            "correct_count": correct_count,
            "total_questions": total_questions,
            "score_percent": score_percent,
        }
        client.table("results").insert(result_payload).execute()

    except APIError as exc:
        return jsonify(error="quiz_submit_failed", message=exc.message), 400
    except Exception as exc:
        return jsonify(error="unexpected_error", detail=str(exc)), 500

    return jsonify(
        score_percent=score_percent,
        correct_count=correct_count,
        total_questions=total_questions,
    ), 201
