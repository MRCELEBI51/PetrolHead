import axios from 'axios';
import { BASE_URL } from '../constants/index.js';
import { getHeaders } from './authService.js';

export const followUser = async (targetId, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.post(
      `${BASE_URL}/users/${targetId}/follow`,
      {},
      { headers }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const getFollowing = async (userId, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.get(`${BASE_URL}/users/${userId}/following`, { headers });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const getFollowers = async (userId, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.get(`${BASE_URL}/users/${userId}/followers`, { headers });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const getUserProfile = async (userId, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.get(`${BASE_URL}/users/${userId}`, { headers });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const searchUsers = async (query, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.get(`${BASE_URL}/users/search?q=${query}`, { headers });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};
