import Joi from 'joi';

const objectIdLike = Joi.string().pattern(/^[a-f\d]{24}$/i);

export const cardCreateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).optional().allow(''),
  listId: objectIdLike.required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  labels: Joi.array().items(Joi.string().valid('red','orange','yellow','green','blue','purple','pink','gray')).optional(),
  dueDate: Joi.date().optional().allow(null),
  position: Joi.number().integer().min(0).optional()
});

export const cardUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().max(2000).optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  labels: Joi.array().items(Joi.string().valid('red','orange','yellow','green','blue','purple','pink','gray')).optional(),
  dueDate: Joi.date().optional().allow(null),
  position: Joi.number().integer().min(0).optional(),
  checklist: Joi.any().optional()
}).min(1);

export const cardQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  sort: Joi.string().optional().default('newest').custom((value, helpers) => {
    if (value == null) return value;
    const allowed = new Set([
      'newest', 'oldest', 'dueDate', 'priority', 'alphabetical', 'duedate', 'due_date'
    ]);
    if (!allowed.has(value)) return helpers.error('any.invalid');
    return value;
  }, 'sort alias validation'),
  status: Joi.string().valid('todo', 'in-progress', 'review', 'done').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  assignedTo: objectIdLike.optional()
});

// ── New validators for previously unvalidated routes ─────────────────────────

export const cardMoveSchema = Joi.object({
  listId: objectIdLike.required().messages({
    'any.required': 'Target list ID is required',
    'string.pattern.base': 'Target list ID must be a valid MongoDB ObjectId'
  }),
  position: Joi.number().integer().min(0).optional()
});

export const cardCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required().messages({
    'any.required': 'Comment text is required',
    'string.empty': 'Comment cannot be empty',
    'string.max': 'Comment cannot exceed 2000 characters'
  })
});

export const cardAssignSchema = Joi.object({
  userId: objectIdLike.required().messages({
    'any.required': 'User ID is required',
    'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
  })
});



