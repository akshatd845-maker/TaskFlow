import Joi from 'joi';

const objectIdLike = Joi.string().pattern(/^[a-f\d]{24}$/i);

export const listCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  boardId: objectIdLike.required(),
  position: Joi.number().integer().min(0).optional()
});

export const listUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  position: Joi.number().integer().min(0).optional()
}).min(1);

export const listReorderSchema = Joi.object({
  boardId: objectIdLike.required(),
  listIds: Joi.array().items(objectIdLike).min(1).required()
});