import Joi from 'joi';

const objectIdLike = Joi.string().pattern(/^[a-f\d]{24}$/i);

export const notificationCreateSchema = Joi.object({
  user: objectIdLike.required(),
  type: Joi.string().valid('project_created', 'task_assigned', 'task_completed', 'comment_added', 'member_added', 'custom').required(),
  message: Joi.string().trim().min(1).max(500).required(),
  referenceId: objectIdLike.optional()
});

export const notificationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional()
});