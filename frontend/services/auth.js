import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const signup = async (data) => {
  const res = await axios.post(`${API_BASE}/auth/signup`, data);
  return res.data;
};

export const login = async (data) => {
  const res = await axios.post(`${API_BASE}/auth/login`, data);
  return res.data;
};