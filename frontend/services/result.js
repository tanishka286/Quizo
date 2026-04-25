import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const getMyResults = async (token) => {
  const res = await axios.get(`${API_BASE}/results/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = res.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};
