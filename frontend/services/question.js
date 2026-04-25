import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const addQuestion = async (quizId, data, token) => {
  const res = await axios.post(`${API_BASE}/quiz/${quizId}/question/add`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const updateQuestion = async (questionId, data, token) => {
  const res = await axios.put(`${API_BASE}/question/${questionId}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const deleteQuestion = async (questionId, token) => {
  const res = await axios.delete(`${API_BASE}/question/${questionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};
