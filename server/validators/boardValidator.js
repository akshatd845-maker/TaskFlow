import Joi from 'joi';

const objectIdLike = Joi.string().pattern(/^[a-f\d]{24}$/i);

export const boardCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).optional().allow(''),
  projectId: objectIdLike.optional(),
  background: Joi.string().trim().optional()
});

export const boardUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  background: Joi.string().trim().optional()
}).min(1);

export const boardQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  search: Joi.string().trim().max(100).optional()
});