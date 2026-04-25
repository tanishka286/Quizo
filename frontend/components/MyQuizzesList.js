"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteQuiz, getMyQuizzes, updateQuiz } from "@/services/quiz";
import { getQuiz } from "@/services/attempt";
import { deleteQuestion, updateQuestion } from "@/services/question";
import AddQuestionForm from "@/components/AddQuestionForm";

const isAuthTokenError = (err) => {
  const status = err?.response?.status;
  const errorText = `${err?.response?.data?.error || ""} ${
    err?.response?.data?.message || ""
  }`.toLowerCase();
  return status === 401 || errorText.includes("jwt") || errorText.includes("token");
};

const formatCreatedAt = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

export default function MyQuizzesList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    duration: "",
    shuffle_questions: false,
  });
  const [questionDrafts, setQuestionDrafts] = useState([]);
  const [editorError, setEditorError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [copiedQuizId, setCopiedQuizId] = useState("");

  useEffect(() => {
    const loadQuizzes = async () => {
      const token =
        window.localStorage.getItem("token") ||
        window.localStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const quizRows = await getMyQuizzes(token);
        setQuizzes(quizRows);
      } catch (err) {
        if (isAuthTokenError(err)) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load quizzes."
        );
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, [router]);

  const getToken = () =>
    window.localStorage.getItem("token") || window.localStorage.getItem("access_token");

  const handleCopyLink = async (quizId) => {
    const link = new URL(
      `/quiz/${encodeURIComponent(quizId)}`,
      window.location.origin
    ).toString();
    try {
      await navigator.clipboard.writeText(link);
      setCopiedQuizId(quizId);
    } catch {
      setError("Failed to copy link.");
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    const shouldDelete = window.confirm("Are you sure you want to delete this quiz?");
    if (!shouldDelete) return;

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActionLoadingId(quizId);
      await deleteQuiz(quizId, token);
      setQuizzes((prev) => prev.filter((quiz) => quiz.id !== quizId));
      if (editingQuizId === quizId) setEditingQuizId(null);
    } catch (err) {
      if (isAuthTokenError(err)) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete quiz."
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const beginEditQuiz = (quiz) => {
    setEditingQuizId(quiz.id);
    setEditorError("");
    setEditForm({
      title: quiz.title || "",
      duration: String(quiz.duration_seconds || ""),
      shuffle_questions: Boolean(quiz.shuffle_questions),
    });
    loadQuizQuestions(quiz.id);
  };

  const loadQuizQuestions = async (quizId) => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const data = await getQuiz(quizId, token);
      const rows = (data?.questions || []).map((q) => ({
        id: q.id,
        prompt: q.prompt || "",
        choices: Array.isArray(q.choices) ? q.choices : [],
        correct_option:
          typeof q.correct_option === "number" ? q.correct_option : 0,
      }));
      setQuestionDrafts(rows);
    } catch (err) {
      if (isAuthTokenError(err)) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }
      setEditorError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load quiz questions."
      );
      setQuestionDrafts([]);
    }
  };

  const handleSaveEdit = async (quizId) => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const parsedDuration = Number(editForm.duration);
    if (!editForm.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setError("Duration must be greater than 0.");
      return;
    }

    try {
      setActionLoadingId(quizId);
      setError("");
      const response = await updateQuiz(
        quizId,
        {
          title: editForm.title.trim(),
          duration_seconds: Math.round(parsedDuration),
          shuffle_questions: editForm.shuffle_questions,
        },
        token
      );

      const updatedQuiz = response?.quiz;
      setQuizzes((prev) =>
        prev.map((quiz) =>
          quiz.id === quizId
            ? {
                ...quiz,
                title: updatedQuiz?.title ?? editForm.title.trim(),
                duration_seconds:
                  updatedQuiz?.duration_seconds ?? Math.round(parsedDuration),
                shuffle_questions:
                  updatedQuiz?.shuffle_questions ?? editForm.shuffle_questions,
              }
            : quiz
        )
      );
      setEditingQuizId(null);
    } catch (err) {
      if (isAuthTokenError(err)) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update quiz."
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const validateQuestionDraft = (draft) => {
    if (!draft.prompt.trim()) return "Question prompt is required.";
    if (!Array.isArray(draft.choices) || draft.choices.length < 2) {
      return "Each question needs at least 2 choices.";
    }
    if (draft.choices.some((choice) => !String(choice || "").trim())) {
      return "Choices cannot be empty.";
    }
    if (
      typeof draft.correct_option !== "number" ||
      draft.correct_option < 0 ||
      draft.correct_option >= draft.choices.length
    ) {
      return "Select a valid correct option.";
    }
    return "";
  };

  const handleSaveAllChanges = async (quizId) => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const parsedDuration = Number(editForm.duration);
    if (!editForm.title.trim()) {
      setEditorError("Title is required.");
      return;
    }
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setEditorError("Duration must be greater than 0.");
      return;
    }

    for (const draft of questionDrafts) {
      const validationError = validateQuestionDraft(draft);
      if (validationError) {
        setEditorError(validationError);
        return;
      }
    }

    try {
      setActionLoadingId(`save-all-${quizId}`);
      setEditorError("");

      const quizResponse = await updateQuiz(
        quizId,
        {
          title: editForm.title.trim(),
          duration_seconds: Math.round(parsedDuration),
          shuffle_questions: editForm.shuffle_questions,
        },
        token
      );

      await Promise.all(
        questionDrafts.map((draft) =>
          updateQuestion(
            draft.id,
            {
              prompt: draft.prompt.trim(),
              choices: draft.choices.map((choice) => String(choice).trim()),
              correct_option: draft.correct_option,
            },
            token
          )
        )
      );

      const updatedQuiz = quizResponse?.quiz;
      setQuizzes((prev) =>
        prev.map((quiz) =>
          quiz.id === quizId
            ? {
                ...quiz,
                title: updatedQuiz?.title ?? editForm.title.trim(),
                duration_seconds:
                  updatedQuiz?.duration_seconds ?? Math.round(parsedDuration),
                shuffle_questions:
                  updatedQuiz?.shuffle_questions ?? editForm.shuffle_questions,
              }
            : quiz
        )
      );
      setEditingQuizId(null);
    } catch (err) {
      if (isAuthTokenError(err)) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }
      setEditorError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to save changes."
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const handleQuestionFieldChange = (questionId, updater) => {
    setQuestionDrafts((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, ...updater(question) } : question
      )
    );
  };

  const handleSaveQuestion = async (questionId) => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const draft = questionDrafts.find((q) => q.id === questionId);
    if (!draft) return;
    if (!draft.prompt.trim()) {
      setEditorError("Question prompt is required.");
      return;
    }
    if (!Array.isArray(draft.choices) || draft.choices.length < 2) {
      setEditorError("Each question needs at least 2 choices.");
      return;
    }
    if (draft.choices.some((choice) => !String(choice || "").trim())) {
      setEditorError("Choices cannot be empty.");
      return;
    }
    if (
      typeof draft.correct_option !== "number" ||
      draft.correct_option < 0 ||
      draft.correct_option >= draft.choices.length
    ) {
      setEditorError("Select a valid correct option.");
      return;
    }

    try {
      setActionLoadingId(questionId);
      setEditorError("");
      await updateQuestion(
        questionId,
        {
          prompt: draft.prompt.trim(),
          choices: draft.choices.map((choice) => String(choice).trim()),
          correct_option: draft.correct_option,
        },
        token
      );
    } catch (err) {
      if (isAuthTokenError(err)) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }
      setEditorError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update question."
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const shouldDelete = window.confirm("Delete this question?");
    if (!shouldDelete) return;

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setActionLoadingId(questionId);
      await deleteQuestion(questionId, token);
      setQuestionDrafts((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err) {
      if (isAuthTokenError(err)) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }
      setEditorError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete question."
      );
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">My Quizzes</h2>
      <p className="mt-2 text-sm text-slate-600">All quizzes created by you.</p>

      {loading ? <p className="mt-5 text-sm text-slate-600">Loading quizzes...</p> : null}

      {error ? (
        <p className="mt-5 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      {!loading && !error && quizzes.length === 0 ? (
        <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No quizzes yet.
        </p>
      ) : null}

      {!loading && !error && quizzes.length > 0 ? (
        <div className="mt-5 space-y-3">
          {quizzes.map((quiz) => {
            const shareLink = new URL(
              `/quiz/${encodeURIComponent(quiz.id)}`,
              window.location.origin
            ).toString();

            return (
              <article
                key={quiz.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-left">
                  <h3 className="text-base font-semibold text-slate-900">
                    {quiz.title || "Untitled Quiz"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Duration: {quiz.duration_seconds} seconds
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Created: {formatCreatedAt(quiz.created_at)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Questions: {quiz.question_count ?? 0}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <a
                      href={shareLink}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-xs text-blue-700 underline hover:text-blue-800"
                    >
                      {shareLink}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(quiz.id)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => beginEditQuiz(quiz)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Edit Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    disabled={actionLoadingId === quiz.id}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actionLoadingId === quiz.id ? "Deleting..." : "Delete Quiz"}
                  </button>
                </div>
              </div>

              {editingQuizId === quiz.id ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                  {editorError ? (
                    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                      {editorError}
                    </p>
                  ) : null}
                  <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, title: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Duration (seconds)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={editForm.duration}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, duration: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={editForm.shuffle_questions}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              shuffle_questions: e.target.checked,
                            }))
                          }
                        />
                        Shuffle Questions
                      </label>
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">Questions</h4>
                        {questionDrafts.length === 0 ? (
                          <p className="text-sm text-slate-600">No questions found for this quiz.</p>
                        ) : null}

                        {questionDrafts.map((question, questionIndex) => (
                          <article
                            key={question.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Question {questionIndex + 1}
                            </label>
                            <input
                              type="text"
                              value={question.prompt}
                              onChange={(e) =>
                                handleQuestionFieldChange(question.id, () => ({
                                  prompt: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                            />

                            <div className="mt-3 space-y-2">
                              {question.choices.map((choice, choiceIndex) => (
                                <div
                                  key={`${question.id}-choice-${choiceIndex}`}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="radio"
                                    name={`correct-${question.id}`}
                                    checked={question.correct_option === choiceIndex}
                                    onChange={() =>
                                      handleQuestionFieldChange(question.id, () => ({
                                        correct_option: choiceIndex,
                                      }))
                                    }
                                  />
                                  <input
                                    type="text"
                                    value={choice}
                                    onChange={(e) =>
                                      handleQuestionFieldChange(question.id, (prevQuestion) => {
                                        const nextChoices = [...prevQuestion.choices];
                                        nextChoices[choiceIndex] = e.target.value;
                                        return { choices: nextChoices };
                                      })
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                                  />
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveQuestion(question.id)}
                                disabled={actionLoadingId === question.id}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {actionLoadingId === question.id ? "Updating..." : "Update"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(question.id)}
                                disabled={actionLoadingId === question.id}
                                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {actionLoadingId === question.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>

                      <AddQuestionForm
                        quizId={quiz.id}
                        onQuestionAdded={() => loadQuizQuestions(quiz.id)}
                      />

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleSaveAllChanges(quiz.id)}
                          disabled={actionLoadingId === `save-all-${quiz.id}`}
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {actionLoadingId === `save-all-${quiz.id}`
                            ? "Saving..."
                            : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingQuizId(null)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                  </div>
                </div>
              ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
