import axios from "axios";

const API_BASE = "http://127.0.0.1:5000";

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
