import { z } from 'zod';

const ITEM_TYPES = ['multiple-choice', 'free-response', 'essay'] as const;
const STATUSES = ['draft', 'review', 'approved', 'archived'] as const;
const SECURITY_LEVELS = ['standard', 'secure', 'highly-secure'] as const;

const contentSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});

export const createItemSchema = z.object({
  subject: z.string().min(1),
  itemType: z.enum(ITEM_TYPES),
  difficulty: z.number().int().min(1).max(5),
  content: contentSchema,
  metadata: z.object({
    author: z.string().min(1),
    status: z.enum(STATUSES),
    tags: z.array(z.string()),
  }),
  securityLevel: z.enum(SECURITY_LEVELS),
}).strict();

export const updateItemSchema = z.object({
  subject: z.string().min(1).optional(),
  itemType: z.enum(ITEM_TYPES).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  content: contentSchema.partial().optional(),
  metadata: z.object({
    author: z.string().min(1),
    status: z.enum(STATUSES),
    tags: z.array(z.string()),
  }).partial().optional(),
  securityLevel: z.enum(SECURITY_LEVELS).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export const listItemsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(STATUSES).optional(),
}).strict();
