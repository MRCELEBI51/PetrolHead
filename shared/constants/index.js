const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
export const BASE_URL = isWeb
  ? 'http://localhost:3000/api'
  : 'http://192.168.1.22:3000/api';
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
export const MAX_IMAGE_SIZE = 5242880;
export const ERROR_MESSAGES = {
  LOGIN: 'Giriş yapılırken bir hata oluştu, lütfen bilgilerinizi kontrol edip tekrar deneyin.',
  REGISTER: 'Kayıt işlemi sırasında bir hata oluştu, lütfen bilgileri kontrol edip tekrar deneyin.',
  NETWORK: 'Ağ bağlantısı hatası oluştu, lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
};
export const OTOAI_SYSTEM_PROMPT = 'Sen PetrolHead Social uygulamasının araç asistanısın. Kullanıcıların araç sorunlarını analiz et, kısa ve net Türkçe yanıt ver.';
export const CLOUDINARY_CLOUD_NAME = 'dyvvqqvwj';
export const CLOUDINARY_UPLOAD_PRESET = 'petrolhead_unsigned';
