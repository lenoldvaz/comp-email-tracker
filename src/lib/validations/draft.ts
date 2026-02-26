import { z } from "zod/v4"

export const createDraftSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.string().max(998).optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  isTemplate: z.boolean().optional(),
  templateName: z.string().max(200).nullable().optional(),
})

export const updateDraftSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.string().max(998).optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  isTemplate: z.boolean().optional(),
  templateName: z.string().max(200).nullable().optional(),
})

export const createSnippetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  htmlContent: z.string().min(1),
})

export const updateSnippetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  htmlContent: z.string().optional(),
})

export const updateGlobalStylesSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontFamily: z.string().min(1).max(200).optional(),
  headingFont: z.string().min(1).max(200).optional(),
  buttonStyle: z.object({
    borderRadius: z.string(),
    padding: z.string(),
  }).optional(),
  linkColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const transformSchema = z.object({
  inlineCss: z.boolean().optional(),
  minify: z.boolean().optional(),
  cleanCss: z.boolean().optional(),
  utmParams: z.object({
    source: z.string().min(1),
    medium: z.string().min(1),
    campaign: z.string().min(1),
  }).optional(),
})

export const testSendSchema = z.object({
  to: z.array(z.string().email()).min(1).max(10),
  subject: z.string().min(1).max(998).optional(),
})
