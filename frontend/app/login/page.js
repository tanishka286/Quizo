"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const redirect = searchParams.get("redirect") || "";
  const safeRedirectPath = redirect.startsWith("/") ? redirect : "";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login(form);

      const token =
        data?.access_token || data?.session?.access_token || data?.token;
      if (!token) {
        throw new Error("Login succeeded but no access token was returned.");
      }

      localStorage.setItem("access_token", token);
      localStorage.setItem("token", token);

      if (safeRedirectPath) {
        router.push(safeRedirectPath);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      if (!err?.response) {
        setError(
          "Cannot connect to backend. Start Flask API on http://127.0.0.1:5000."
        );
      } else {
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            "Login failed"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[75vh] place-items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-sm"
      >
        <h2 className="mb-1 text-2xl font-bold text-slate-800">Login</h2>
        <p className="mb-6 text-sm text-slate-600">
          Welcome back to Quizo. Sign in to continue.
        </p>

        {error && (
          <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="Email"
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500"
          onChange={handleChange}
          required
        />

        <label
          className="mb-1 block text-sm font-medium text-slate-700"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="Password"
          className="mb-5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500"
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-slate-500 mt-4 text-center">
          Don&apos;t have an account?
          <span
            className="text-black cursor-pointer ml-1"
            onClick={() => router.push(`/signup?redirect=${encodeURIComponent(redirect || "/")}`)}
          >
            Sign up
          </span>
        </p>
      </form>
    </div>
  );
}