let dbConnected = false;
let dbDisconnectedReason = 'unknown';

export const setDbConnected = () => {
  dbConnected = true;
  dbDisconnectedReason = undefined;
};

export const setDbDisconnected = (reason) => {
  dbConnected = false;
  dbDisconnectedReason = reason || 'disconnected';
};

export const isDbConnected = () => dbConnected;

export const getDbStatus = () => {
  return {
    connected: dbConnected,
    ...(dbConnected ? {} : { reason: dbDisconnectedReason })
  };
};

export const requireDbConnected = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({
      status: 'degraded',
      database: 'disconnected'
    });
  }
  next();
};

