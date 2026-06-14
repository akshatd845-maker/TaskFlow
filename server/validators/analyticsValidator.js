import Joi from 'joi';

const objectIdLike = Joi.string().pattern(/^[a-f\d]{24}$/i);

export const analyticsQuerySchema = Joi.object({
  projectId: objectIdLike.optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional()
});