import mongoose from 'mongoose';

const objectIdFields = [
  'id',
  'projectId',
  'boardId',
  'listId',
  'cardId',
  'userId'
];

const isValidObjectId = (value) => {
  if (value === undefined || value === null) return true; // ignore missing
  // allow only 24 hex
  return mongoose.Types.ObjectId.isValid(String(value));
};

export const validateObjectId = (req, res, next) => {
  for (const field of objectIdFields) {
    if (req.params && Object.prototype.hasOwnProperty.call(req.params, field)) {
      const val = req.params[field];
      if (!isValidObjectId(val)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ObjectId',
          errors: [{ path: field, message: 'Invalid Mongo ObjectId' }]
        });
      }
    }
  }

  next();
};

