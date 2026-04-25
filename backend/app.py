import config.supabase_client  # initializes Supabase client from env

from flask import Flask, jsonify

from routes.auth_routes import auth_bp
from routes.question_routes import question_bp
from routes.quiz_routes import quiz_bp
from routes.results_routes import results_bp

app = Flask(__name__)
app.register_blueprint(auth_bp)
app.register_blueprint(quiz_bp)
app.register_blueprint(question_bp)
app.register_blueprint(results_bp)


@app.after_request
def add_cors_headers(response):
    # Allow frontend dev servers to call the Flask API from browser.
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response


@app.route("/")
def index():
    return jsonify(message="Quizo API", status="ok")


if __name__ == "__main__":
    app.run(debug=True)
