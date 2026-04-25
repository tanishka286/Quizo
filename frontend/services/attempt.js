import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const getQuiz = async (quizId, token) => {
  const res = await axios.get(`${API_BASE}/quiz/${quizId}/attempt`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const submitQuiz = async (quizId, data, token) => {
  const res = await axios.post(`${API_BASE}/quiz/${quizId}/submit`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};
