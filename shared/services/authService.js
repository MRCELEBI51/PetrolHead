import axios from 'axios';
import { BASE_URL } from '../constants/index.js';

export const register = async (username, email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      username,
      email,
      password
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};

export const logout = async () => {
  try {
    localStorage.removeItem('token');
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};
