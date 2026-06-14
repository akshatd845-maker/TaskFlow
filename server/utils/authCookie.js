const isProduction = process.env.NODE_ENV === 'production';

export const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/'
};

export const setAuthCookie = (res, token) => {
  res.cookie('token', token, cookieOptions);
};

export const clearAuthCookie = (res) => {
  res.clearCookie('token', cookieOptions);
};

export const getTokenFromRequest = (req) => {
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

export const getTokenFromSocketHandshake = (socket) => {
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }
  const cookieHeader = socket.handshake.headers?.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};
