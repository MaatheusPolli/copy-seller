import { z } from 'zod';

export const channelIds = ['mercadolivre', 'amazon', 'shopee', 'vtex'] as const;

export const ChannelProfileSchema = z.object({
  id: z.enum(channelIds),
  title: z.object({
    maxLength: z.number().int().positive(),
    mustStartWith: z.enum(['brand', 'category']).optional(),
    forbidden: z.array(z.string()).default([]),
  }),
  description: z.object({
    maxLength: z.number().int().positive(),
    allowHtml: z.boolean(),
    requiredAttributes: z.array(z.string()).default([]),
  }),
  tone: z.string().min(1),
  /** atributo canônico → formas equivalentes aceitas no texto */
  synonyms: z.record(z.array(z.string())).default({}),
});

export type ChannelId = (typeof channelIds)[number];
export type ChannelProfile = z.infer<typeof ChannelProfileSchema>;
