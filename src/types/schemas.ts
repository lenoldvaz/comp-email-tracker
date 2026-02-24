import { z } from "zod/v4"

// Competitors
export const createCompetitorSchema = z.object({
  name: z.string().min(1),
  domains: z.array(z.string().min(1)).min(1),
  logoUrl: z.string().url().optional(),
  colourHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const updateCompetitorSchema = z.object({
  name: z.string().min(1).optional(),
  domains: z.array(z.string().min(1)).min(1).optional(),
  logoUrl: z.string().url().nullable().optional(),
  colourHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
})

// Categories
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100),
})

// Tags
export const createTagSchema = z.object({
  name: z.string().min(1).max(100).transform((v) => v.toLowerCase().trim()),
})

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).transform((v) => v.toLowerCase().trim()),
})

// Email tag operations
export const addTagToEmailSchema = z.object({
  name: z.string().min(1).max(100).transform((v) => v.toLowerCase().trim()),
})

export const removeTagFromEmailSchema = z.object({
  tagId: z.string().min(1),
})

// Email update
export const updateEmailSchema = z.object({
  categoryId: z.string().nullable().optional(),
})
