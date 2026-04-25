import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const getProfile = async (token) => {
  const res = await axios.get(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};
