import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const thoughts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/thoughts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      order: z.number().optional(),
      image: image().optional(),
      tags: z.array(z.string()).optional(),
      authors: z.array(z.string()).optional(),
      draft: z.boolean().optional(),
    }),
})

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      image: image(),
      link: z.string().url(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }),
})

const albums = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/albums' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      year: z.number().int(),
      artists: z.array(z.string()),
      rating: z.number().int().min(0).max(100),
      image: image().optional(),
      category: z.string().optional(),
    }),
})

const movies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/movies' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      year: z.number().int(),
      directors: z.array(z.string()),
      rating: z.number().int().min(0).max(100),
      runtimeMinutes: z.number().int().optional(),
      image: image().optional(),
      category: z.string().optional(),
    }),
})

export const collections = { thoughts, projects, albums, movies }
