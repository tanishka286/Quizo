import axios from "axios";

const API_BASE = "http://127.0.0.1:5000";

export const getProfile = async (token) => {
  const res = await axios.get(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};
