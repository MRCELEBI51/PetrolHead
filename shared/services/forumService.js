import axios from 'axios';
import { BASE_URL } from '../constants/index.js';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getTopics = async (page = 1) => {
  try {
    const response = await axios.get(`${BASE_URL}/topics?page=${page}`, {
      headers: getHeaders()
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};

export const createTopic = async (title, body) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/topics`,
      { title, body },
      { headers: getHeaders() }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};

export const addComment = async (topicId, comment) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/topics/${topicId}/comments`,
      { comment },
      { headers: getHeaders() }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};
