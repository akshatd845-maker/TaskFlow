import Joi from 'joi';

const objectIdLike = Joi.string().pattern(/^[a-f\d]{24}$/i);

export const commentCreateSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
  taskId: objectIdLike.required()
});

export const commentUpdateSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).optional()
}).min(1);

export const commentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional()
});