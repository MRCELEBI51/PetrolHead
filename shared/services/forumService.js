import axios from 'axios';
import { BASE_URL } from '../constants/index.js';
import { getHeaders } from './authService.js';

export const getTopics = async (page = 1, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.get(`${BASE_URL}/topics?page=${page}`, { headers });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const getTopicById = async (id, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.get(`${BASE_URL}/topics/${id}`, { headers });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const createTopic = async (title, body, category, vehicle, images, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.post(
      `${BASE_URL}/topics`,
      { title, body, category, vehicle, images },
      { headers }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const addComment = async (topicId, comment, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.post(
      `${BASE_URL}/topics/${topicId}/comments`,
      { comment },
      { headers }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const voteComment = async (topicId, commentId, type, token) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : await getHeaders();
    const response = await axios.post(
      `${BASE_URL}/topics/${topicId}/comments/${commentId}/vote`,
      { type },
      { headers }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};
