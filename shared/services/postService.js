import axios from 'axios';
import { BASE_URL } from '../constants/index.js';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPosts = async (page = 1) => {
  try {
    const response = await axios.get(`${BASE_URL}/posts?page=${page}`, {
      headers: getHeaders()
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};

export const createPost = async (imageUrl, description) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/posts`,
      { imageUrl, description },
      { headers: getHeaders() }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};

export const likePost = async (postId) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/posts/${postId}/like`,
      {},
      { headers: getHeaders() }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};
