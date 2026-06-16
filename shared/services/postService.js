import axios from 'axios';
import { BASE_URL } from '../constants/index.js';
import { getHeaders } from './authService.js';

export const getPosts = async (page = 1, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.get(`${BASE_URL}/posts?page=${page}`, { headers });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const createPost = async (imageUrl, description, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.post(
      `${BASE_URL}/posts`,
      { imageUrl, description },
      { headers }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const likePost = async (postId, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.post(
      `${BASE_URL}/posts/${postId}/like`,
      {},
      { headers }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};
