import axios from 'axios';
import { BASE_URL } from '../constants/index.js';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getEvents = async (page = 1) => {
  try {
    const response = await axios.get(`${BASE_URL}/events?page=${page}`, {
      headers: getHeaders()
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};

export const createEvent = async (title, location, date, description) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/events`,
      { title, location, date, description },
      { headers: getHeaders() }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};

export const joinEvent = async (eventId) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/events/${eventId}/join`,
      {},
      { headers: getHeaders() }
    );
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data || error.message };
  }
};
