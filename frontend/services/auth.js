import axios from "axios";

const API_BASE = "http://127.0.0.1:5000"; // your Flask backend

export const signup = async (data) => {
  const res = await axios.post(`${API_BASE}/auth/signup`, data);
  return res.data;
};

export const login = async (data) => {
  const res = await axios.post(`${API_BASE}/auth/login`, data);
  return res.data;
};