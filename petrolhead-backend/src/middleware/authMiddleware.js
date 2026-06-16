const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('[authMiddleware] URL:', req.method, req.originalUrl);
  console.log('[authMiddleware] Header:', authHeader ? authHeader.substring(0, 30) + '...' : 'YOK');
  console.log('[authMiddleware] Token:', token ? token.substring(0, 20) + '...' : 'YOK');

  if (!token) {
    return res.status(401).json({ error: 'Yetkilendirme tokenı bulunamadı.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('[authMiddleware] Token doğrulama hatası:', error.message);
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
};

module.exports = authMiddleware;
