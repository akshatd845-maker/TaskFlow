import Joi from 'joi';

export const projectCreateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).optional().allow(''),
  status: Joi.string().valid('active', 'archived', 'completed', 'on-hold').optional(),
  color: Joi.string().trim().optional()
});

export const projectUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  status: Joi.string().valid('active', 'archived', 'completed', 'on-hold').optional(),
  color: Joi.string().trim().optional(),
  isArchived: Joi.boolean().optional()
}).min(1);

export const projectQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  sort: Joi.string().valid('newest', 'oldest', 'alphabetical').default('newest').optional()
});

export const projectMemberQuerySchema = Joi.object({
  memberSearch: Joi.string().trim().max(100).optional(),
  role: Joi.string().valid('owner', 'admin', 'member').optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  sort: Joi.string().valid('alphabetical').default('alphabetical').optional()
});

