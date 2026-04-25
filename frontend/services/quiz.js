import axios from "axios";

const API_BASE = "http://127.0.0.1:5000";

export const createQuiz = async (data, token) => {
  const res = await axios.post(`${API_BASE}/quiz/create`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

const mockQuizzes = [
  {
    id: "demo-quiz-1",
    title: "General Knowledge Basics",
    duration_seconds: 600,
  },
  {
    id: "demo-quiz-2",
    title: "Science Quick Check",
    duration_seconds: 900,
  },
];

export const getAllQuizzes = async (token) => {
  try {
    const res = await axios.get(`${API_BASE}/quiz/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.quizzes)) return payload.quizzes;
    return [];
  } catch (err) {
    if (err?.response?.status === 404) {
      return mockQuizzes;
    }
    throw err;
  }
};

export const getMyQuizzes = async (token) => {
  const res = await axios.get(`${API_BASE}/quiz/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = res.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.quizzes)) return payload.quizzes;
  return [];
};

export const updateQuiz = async (quizId, data, token) => {
  const res = await axios.put(`${API_BASE}/quiz/${quizId}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const deleteQuiz = async (quizId, token) => {
  const res = await axios.delete(`${API_BASE}/quiz/${quizId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};
