import config.supabase_client  # initializes Supabase client from env

import os
from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth_routes import auth_bp
from routes.question_routes import question_bp
from routes.quiz_routes import quiz_bp
from routes.results_routes import results_bp

app = Flask(__name__)
CORS(app, origins="*")
app.register_blueprint(auth_bp)
app.register_blueprint(quiz_bp)
app.register_blueprint(question_bp)
app.register_blueprint(results_bp)


@app.route("/")
def index():
    return jsonify(message="Quizo API", status="ok")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
