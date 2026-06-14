import mongoose from 'mongoose';
import { mongoConnectionOptions } from './mongoOptions.js';
import { setDbConnected, setDbDisconnected } from '../utils/databaseHealth.js';

let lifecycleListenersAttached = false;

const attachConnectionLifecycleListeners = () => {
  if (lifecycleListenersAttached) return;
  lifecycleListenersAttached = true;

  mongoose.connection.on('connected', () => {
    setDbConnected();
  });

  mongoose.connection.on('disconnected', () => {
    setDbDisconnected('mongoose disconnected');
  });

  mongoose.connection.on('error', (err) => {
    setDbDisconnected(err?.message || 'mongoose error');
  });
};





const sanitizeMongoHost = (uri) => {

  // Avoid logging secrets. Extract only host part if possible.
  // Typical Atlas format:
  // mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/<db>?...
  try {
    const withoutScheme = uri.replace(/^mongodb\+srv:\/\//i, '');
    const atIndex = withoutScheme.indexOf('@');
    if (atIndex === -1) return undefined;
    return withoutScheme.slice(atIndex + 1).split('/')[0];
  } catch {
    return undefined;
  }
};

const connectMongoOnce = async (uri, label) => {
  const safeHost = sanitizeMongoHost(uri);
  const isSrv = /^mongodb\+srv:\/\//i.test(uri);

  const conn = await mongoose.connect(uri, {
    // Production-safe defaults (compatible with Atlas)

    maxPoolSize: mongoConnectionOptions.maxPoolSize,
    serverSelectionTimeoutMS: mongoConnectionOptions.serverSelectionTimeoutMS,
    socketTimeoutMS: mongoConnectionOptions.socketTimeoutMS,
    // Avoid query buffering issues in serverless/rapid restarts
    bufferCommands: false,
    retryWrites: true,
    retryReads: true,
  });

  console.log(
    safeHost
      ? `MongoDB Connected (${label}): host=${safeHost} (mongodb+srv=${isSrv})`
      : `MongoDB Connected (${label}) (mongodb+srv=${isSrv})`
  );

  return conn;
};

const connectDB = async () => {
  attachConnectionLifecycleListeners();

  const uri = process.env.MONGODB_URI;
  const directUri = process.env.MONGODB_URI_DIRECT;


  if (!uri) {
    setDbDisconnected('MONGODB_URI missing');
    return null;
  }

  const isSrv = /^mongodb\+srv:\/\//i.test(uri);

  try {
    const conn = await connectMongoOnce(uri, 'MONGODB_URI');
    setDbConnected();
    return conn;
  } catch (error) {
    const message = error?.message || 'Unknown MongoDB connection error';

    setDbDisconnected(message);


    // If Atlas SRV/DNS resolution is blocked, a direct connection string can help.
    const looksLikeDnsOrSrvProblem = /enotfound|eai_again|srv|dns|lookup|systemcall|timed?out/i.test(message);

    if (isSrv && directUri && looksLikeDnsOrSrvProblem) {
      try {
        console.warn(
          `MongoDB SRV/DNS issue detected for MONGODB_URI; retrying with MONGODB_URI_DIRECT. Error: ${message}`
        );
        const conn = await connectMongoOnce(directUri, 'MONGODB_URI_DIRECT');
        setDbConnected();
        return conn;
      } catch (directError) {
        const directMessage = directError?.message || 'Unknown direct MongoDB connection error';
        setDbDisconnected(directMessage);
        console.error(`MongoDB connection failed (MONGODB_URI_DIRECT): ${directMessage}`);
        return null;
      }
    }


    // Do NOT log the URI (may contain credentials)
    console.error(`MongoDB connection failed: ${message}`);

    // Keep Node running; expose DB health via /api/health
    return null;
  }
};


export default connectDB;


