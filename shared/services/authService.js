import axios from 'axios';
import { BASE_URL } from '../constants/index.js';

let Platform;
try {
  Platform = require('react-native').Platform;
} catch (error) {
  Platform = { OS: 'web' };
}

let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (error) {
  try {
    AsyncStorage = require('react-native').AsyncStorage;
  } catch (err) {
    AsyncStorage = null;
  }
}

export const register = async (username, email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      username,
      email,
      password
    });
    const { token } = response.data;
    if (token) {
      if (Platform && Platform.OS !== 'web') {
        if (AsyncStorage) {
          await AsyncStorage.setItem('token', token);
        }
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('token', token);
      }
    }
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const login = async (identifier, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: identifier,
      password
    });
    const { token } = response.data;
    if (token) {
      if (Platform && Platform.OS !== 'web') {
        if (AsyncStorage) {
          await AsyncStorage.setItem('token', token);
        }
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('token', token);
      }
    }
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.response?.data?.error || error.response?.data || error.message };
  }
};

export const logout = async () => {
  try {
    if (Platform && Platform.OS !== 'web') {
      if (AsyncStorage) {
        await AsyncStorage.removeItem('token');
      }
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const getToken = async () => {
  try {
    if (Platform && Platform.OS !== 'web') {
      if (AsyncStorage) {
        return await AsyncStorage.getItem('token');
      }
    } else if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('token');
    }
  } catch (error) {
    return null;
  }
  return null;
};

export const getHeaders = async () => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
