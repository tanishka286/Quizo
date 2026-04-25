"use client";

import { useMemo, useState } from "react";
import { addQuestion } from "@/services/question";

export default function AddQuestionForm({ quizId, onFinishQuiz, onQuestionAdded }) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canRemoveOption = options.length > 2;

  const cleanedOptions = useMemo(
    () => options.map((option) => option.trim()).filter(Boolean),
    [options]
  );

  const handleOptionChange = (index, value) => {
    setOptions((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index) => {
    if (!canRemoveOption) return;

    setOptions((prev) => prev.filter((_, i) => i !== index));
    setCorrectOption((prev) => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!prompt.trim()) {
      setError("Question text is required.");
      return;
    }

    if (cleanedOptions.length < 2) {
      setError("Please provide at least 2 non-empty options.");
      return;
    }

    if (correctOption < 0 || correctOption >= options.length) {
      setError("Please select a valid correct answer.");
      return;
    }

    if (!options[correctOption]?.trim()) {
      setError("Correct answer cannot be empty.");
      return;
    }

    const token =
      window.localStorage.getItem("token") ||
      window.localStorage.getItem("access_token");

    if (!token) {
      setError("You are not logged in. Please login again.");
      return;
    }

    try {
      setLoading(true);
      await addQuestion(
        quizId,
        {
          prompt: prompt.trim(),
          choices: options.map((option) => option.trim()),
          correct_option: correctOption,
        },
        token
      );

      setSuccess("Question added successfully");
      setPrompt("");
      setOptions(["", ""]);
      setCorrectOption(0);
      if (typeof onQuestionAdded === "function") {
        onQuestionAdded();
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to add question."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <h3 className="text-xl font-semibold text-slate-900">Add Question</h3>
        <p className="mt-1 text-sm text-slate-600">
          Add multiple-choice questions to quiz: {quizId}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <label htmlFor="question-prompt" className="text-sm font-medium text-slate-700">
            Question Text
          </label>
          <textarea
            id="question-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Enter your question"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Options</p>
          {options.map((option, index) => {
            const isSelected = correctOption === index;
            return (
              <div
                key={`option-${index}`}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  isSelected ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="correct_option"
                  checked={isSelected}
                  onChange={() => setCorrectOption(index)}
                  className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-200"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  disabled={!canRemoveOption}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={handleAddOption}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Add Option
          </button>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        ) : null}

        {success ? (
          <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Adding..." : "Add Question"}
        </button>

        {typeof onFinishQuiz === "function" ? (
          <button
            type="button"
            onClick={onFinishQuiz}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Finish Quiz
          </button>
        ) : null}
      </form>
    </section>
  );
}
