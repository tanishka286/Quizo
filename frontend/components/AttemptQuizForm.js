"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getQuiz, submitQuiz } from "@/services/attempt";
import { getAllQuizzes } from "@/services/quiz";

export default function AttemptQuizForm({ quizId = "", initialQuizId = "" }) {
  const router = useRouter();
  const resolvedQuizId = (quizId || initialQuizId || "").trim();
  const isDirectLinkMode = Boolean(resolvedQuizId);
  const [quizList, setQuizList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeQuizId, setActiveQuizId] = useState("");
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);

  const answeredCount = useMemo(() => answers.length, [answers]);

  const isAuthTokenError = (err) => {
    const status = err?.response?.status;
    const errorText = `${err?.response?.data?.error || ""} ${
      err?.response?.data?.message || ""
    }`.toLowerCase();
    return status === 401 || errorText.includes("jwt") || errorText.includes("token");
  };

  const getToken = () =>
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("access_token");

  const redirectToLogin = () => {
    const nextPath =
      typeof window !== "undefined" ? window.location.pathname : "/dashboard/student";
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  };

  const loadQuizDirectly = async () => {
    setError("");
    setResult(null);

    const token = getToken();
    console.log("Token:", token);
    console.log("Quiz ID:", resolvedQuizId);

    if (!token) {
      redirectToLogin();
      return;
    }

    if (!resolvedQuizId) {
      setError("Quiz not found or unauthorized");
      return;
    }

    try {
      setLoadingQuiz(true);
      setActiveQuizId(resolvedQuizId);
      const data = await getQuiz(resolvedQuizId, token);
      setQuiz(data?.quiz || null);
      setQuestions(data?.questions || []);
      setAnswers([]);
    } catch (err) {
      console.error("Quiz load error:", err);
      setQuiz(null);
      setQuestions([]);

      if (err?.response?.status === 401 || isAuthTokenError(err)) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        redirectToLogin();
      } else if (err?.response?.status === 403) {
        setError("You are not allowed to access this quiz.");
      } else if (err?.response?.status === 404) {
        setError("Quiz not found.");
      } else {
        setError("Quiz not found or unauthorized");
      }
    } finally {
      setLoadingQuiz(false);
    }
  };

  useEffect(() => {
    if (isDirectLinkMode) {
      setLoadingList(false);
      setQuizList([]);
      return;
    }

    const loadQuizzes = async () => {
      setError("");
      const token = getToken();
      if (!token) {
        redirectToLogin();
        return;
      }

      try {
        setLoadingList(true);
        const quizzes = await getAllQuizzes(token);
        setQuizList(Array.isArray(quizzes) ? quizzes : []);
      } catch (err) {
        if (isAuthTokenError(err)) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("access_token");
          redirectToLogin();
          return;
        }
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load available quizzes."
        );
      } finally {
        setLoadingList(false);
      }
    };

    loadQuizzes();
  }, [isDirectLinkMode, router]); // list mode only

  useEffect(() => {
    if (!isDirectLinkMode) return;
    setHasStarted(false);
    setQuiz(null);
    setQuestions([]);
    setAnswers([]);
    setResult(null);
  }, [resolvedQuizId, isDirectLinkMode]);

  const handleStartQuiz = async (quizId) => {
    setError("");
    setResult(null);

    if (!quizId) {
      setError("Quiz ID is missing.");
      return;
    }

    const token = getToken();
    if (!token) {
      redirectToLogin();
      return;
    }

    try {
      setLoadingQuiz(true);
      setActiveQuizId(quizId);
      const data = await getQuiz(quizId, token);
      setQuiz(data?.quiz || null);
      setQuestions(data?.questions || []);
      setAnswers([]);
    } catch (err) {
      if (isAuthTokenError(err)) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        redirectToLogin();
        return;
      }
      setQuiz(null);
      setQuestions([]);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to start quiz."
      );
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleStartFromIntro = async () => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    if (isDirectLinkMode) {
      await loadQuizDirectly();
    }
    setHasStarted(true);
  };

  const handleSelectOption = (questionId, selectedOption) => {
    setAnswers((prev) => {
      const existingIndex = prev.findIndex((item) => item.question_id === questionId);
      if (existingIndex === -1) {
        return [...prev, { question_id: questionId, selected_option: selectedOption }];
      }

      return prev.map((item, index) =>
        index === existingIndex ? { ...item, selected_option: selectedOption } : item
      );
    });
  };

  const getSelectedOption = (questionId) =>
    answers.find((item) => item.question_id === questionId)?.selected_option;

  const handleSubmitQuiz = async () => {
    setError("");
    setResult(null);

    const quizId = quiz?.id || activeQuizId;
    if (!quizId) {
      setError("Quiz ID is missing.");
      return;
    }

    if (!questions.length) {
      setError("No questions available for submission.");
      return;
    }

    if (answers.length !== questions.length) {
      setError("Please answer all questions before submitting.");
      return;
    }

    const token = getToken();
    if (!token) {
      redirectToLogin();
      return;
    }

    try {
      setSubmitting(true);
      const data = await submitQuiz(quizId, { answers }, token);
      setResult(data);
    } catch (err) {
      if (isAuthTokenError(err)) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        redirectToLogin();
        return;
      }
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to submit quiz."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-2xl mx-auto space-y-6">
      {!isDirectLinkMode ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Available Quizzes</h2>
          <p className="mt-2 text-sm text-slate-600">Select a quiz to start your attempt.</p>

          <div className="mt-5 space-y-3">
            {loadingList ? <p className="text-sm text-slate-600">Loading quizzes...</p> : null}

            {!loadingList && quizList.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No quizzes available
              </div>
            ) : null}

            {quizList.map((quiz) => (
              <div
                key={quiz.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {quiz.title || "Untitled Quiz"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Duration: {quiz.duration_seconds || 0} seconds
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuiz({
                      id: quiz.id,
                      title: quiz.title || "Untitled Quiz",
                      duration_seconds: quiz.duration_seconds || 0,
                    });
                    setQuestions([]);
                    setAnswers([]);
                    setResult(null);
                    setError("");
                    setHasStarted(false);
                    setActiveQuizId(quiz.id);
                  }}
                  disabled={loadingQuiz}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Choose Quiz
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      {!loadingQuiz && !quiz && !hasStarted ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          No quiz loaded yet.
        </div>
      ) : null}

      {quiz && !hasStarted ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">{quiz.title || "Quiz"}</h3>
          <p className="text-sm text-slate-500">
            Duration: {quiz.duration_seconds || "N/A"} seconds
          </p>
          <button
            type="button"
            onClick={async () => {
              if (isDirectLinkMode) {
                await handleStartFromIntro();
              } else {
                await handleStartQuiz(quiz.id);
                setHasStarted(true);
              }
            }}
            className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900"
          >
            Start Quiz
          </button>
        </div>
      ) : null}

      {quiz && hasStarted ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">{quiz.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Duration: {quiz.duration_seconds} seconds
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Answered: {answeredCount}/{questions.length || 0}
            </p>
          </div>

          {(questions || []).map((question, questionIndex) => (
            <article
              key={question.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4"
            >
              <h4 className="font-medium text-slate-900">
                Q{questionIndex + 1}. {question.prompt}
              </h4>

              <div className="mt-4 space-y-2">
                {(question.choices || []).map((choice, optionIndex) => {
                  const selected = getSelectedOption(question.id) === optionIndex;
                  return (
                    <label
                      key={`${question.id}-${optionIndex}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition ${
                        selected
                          ? "border-slate-900 bg-slate-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        checked={selected}
                        onChange={() => handleSelectOption(question.id, optionIndex)}
                        className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-300"
                      />
                      <span className="text-sm text-slate-700">{choice}</span>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}

          <div className="pt-3 text-center">
            <button
              type="button"
              onClick={handleSubmitQuiz}
              disabled={submitting || !questions.length}
              className="rounded-xl bg-black px-7 py-3 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-emerald-800">Quiz Result</h3>
          <p className="mt-2 text-sm text-emerald-700">Score: {result.score_percent}%</p>
          <p className="mt-1 text-sm text-emerald-700">
            Correct: {result.correct_count} / {result.total_questions}
          </p>
        </div>
      ) : null}
    </section>
  );
}
