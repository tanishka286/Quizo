"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "@/services/auth";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const redirect = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("redirect") || "";
  }, []);
  const safeRedirectPath = redirect.startsWith("/") ? redirect : "";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await signup(form);
      const accessToken = data?.session?.access_token;

      if (!accessToken) {
        throw new Error("Signup succeeded but no access token was returned.");
      }

      localStorage.setItem("token", accessToken);
      localStorage.setItem("access_token", accessToken);
      if (safeRedirectPath) {
        router.push(safeRedirectPath);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      if (!err?.response) {
        setError("Cannot connect to backend. Check API configuration and server status.");
      } else {
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            "Signup failed"
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
        <h2 className="mb-1 text-2xl font-bold text-slate-800">Signup</h2>
        <p className="mb-6 text-sm text-slate-600">
          Create your Quizo account in a few seconds.
        </p>

        {error && (
          <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <label
          className="mb-1 block text-sm font-medium text-slate-700"
          htmlFor="full_name"
        >
          Full Name (optional)
        </label>
        <input
          id="full_name"
          type="text"
          name="full_name"
          placeholder="Full Name (optional)"
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500"
          onChange={handleChange}
        />

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

        <fieldset className="mb-5">
          <legend className="mb-2 text-sm font-medium text-slate-700">Role</legend>
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="role"
              value="student"
              checked={form.role === "student"}
              onChange={handleChange}
              className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Student
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="role"
              value="teacher"
              checked={form.role === "teacher"}
              onChange={handleChange}
              className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Teacher
          </label>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Signing up..." : "Signup"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirect || "/")}`}
            className="font-medium text-slate-800 hover:text-black"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}