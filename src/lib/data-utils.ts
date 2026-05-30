import { getCollection, render, type CollectionEntry } from 'astro:content'
import { readingTime, calculateWordCountFromHtml } from '@/lib/utils'

export async function getAllPosts(): Promise<CollectionEntry<'thoughts'>[]> {
  const posts = await getCollection('thoughts')
  return posts
    .filter((post) => !post.data.draft && !isSubpost(post.id))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

export async function getAllPostsAndSubposts(): Promise<
  CollectionEntry<'thoughts'>[]
> {
  const posts = await getCollection('thoughts')
  return posts
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

export async function getAllProjects(): Promise<CollectionEntry<'projects'>[]> {
  const projects = await getCollection('projects')
  return projects.sort((a, b) => {
    const dateA = a.data.startDate?.getTime() || 0
    const dateB = b.data.startDate?.getTime() || 0
    return dateB - dateA
  })
}

export async function getAllTags(): Promise<Map<string, number>> {
  const posts = await getAllPosts()
  return posts.reduce((acc, post) => {
    post.data.tags?.forEach((tag) => {
      acc.set(tag, (acc.get(tag) || 0) + 1)
    })
    return acc
  }, new Map<string, number>())
}

export async function getAdjacentPosts(currentId: string): Promise<{
  newer: CollectionEntry<'thoughts'> | null
  older: CollectionEntry<'thoughts'> | null
  parent: CollectionEntry<'thoughts'> | null
}> {
  const allPosts = await getAllPosts()

  if (isSubpost(currentId)) {
    const parentId = getParentId(currentId)
    const allPosts = await getAllPosts()
    const parent = allPosts.find((post) => post.id === parentId) || null

    const posts = await getCollection('thoughts')
    const subposts = posts
      .filter(
        (post) =>
          isSubpost(post.id) &&
          getParentId(post.id) === parentId &&
          !post.data.draft,
      )
      .sort((a, b) => {
        const dateDiff = a.data.date.valueOf() - b.data.date.valueOf()
        if (dateDiff !== 0) return dateDiff

        const orderA = a.data.order ?? 0
        const orderB = b.data.order ?? 0
        return orderA - orderB
      })

    const currentIndex = subposts.findIndex((post) => post.id === currentId)
    if (currentIndex === -1) {
      return { newer: null, older: null, parent }
    }

    return {
      newer:
        currentIndex < subposts.length - 1 ? subposts[currentIndex + 1] : null,
      older: currentIndex > 0 ? subposts[currentIndex - 1] : null,
      parent,
    }
  }

  const parentPosts = allPosts.filter((post) => !isSubpost(post.id))
  const currentIndex = parentPosts.findIndex((post) => post.id === currentId)

  if (currentIndex === -1) {
    return { newer: null, older: null, parent: null }
  }

  return {
    newer: currentIndex > 0 ? parentPosts[currentIndex - 1] : null,
    older:
      currentIndex < parentPosts.length - 1
        ? parentPosts[currentIndex + 1]
        : null,
    parent: null,
  }
}

export async function getPostsByTag(
  tag: string,
): Promise<CollectionEntry<'thoughts'>[]> {
  const posts = await getAllPosts()
  return posts.filter((post) => post.data.tags?.includes(tag))
}

export async function getRecentPosts(
  count: number,
): Promise<CollectionEntry<'thoughts'>[]> {
  const posts = await getAllPosts()
  return posts.slice(0, count)
}

export async function getSortedTags(): Promise<
  { tag: string; count: number }[]
> {
  const tagCounts = await getAllTags()
  return [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      const countDiff = b.count - a.count
      return countDiff !== 0 ? countDiff : a.tag.localeCompare(b.tag)
    })
}

export function getParentId(subpostId: string): string {
  return subpostId.split('/')[0]
}

export async function getSubpostsForParent(
  parentId: string,
): Promise<CollectionEntry<'thoughts'>[]> {
  const posts = await getCollection('thoughts')
  return posts
    .filter(
      (post) =>
        !post.data.draft &&
        isSubpost(post.id) &&
        getParentId(post.id) === parentId,
    )
    .sort((a, b) => {
      const dateDiff = a.data.date.valueOf() - b.data.date.valueOf()
      if (dateDiff !== 0) return dateDiff

      const orderA = a.data.order ?? 0
      const orderB = b.data.order ?? 0
      return orderA - orderB
    })
}

export function groupPostsByYear(
  posts: CollectionEntry<'thoughts'>[],
): Record<string, CollectionEntry<'thoughts'>[]> {
  return posts.reduce(
    (acc: Record<string, CollectionEntry<'thoughts'>[]>, post) => {
      const year = post.data.date.getFullYear().toString()
      ;(acc[year] ??= []).push(post)
      return acc
    },
    {},
  )
}

export async function hasSubposts(postId: string): Promise<boolean> {
  const subposts = await getSubpostsForParent(postId)
  return subposts.length > 0
}

export function isSubpost(postId: string): boolean {
  return postId.includes('/')
}

export async function getParentPost(
  subpostId: string,
): Promise<CollectionEntry<'thoughts'> | null> {
  if (!isSubpost(subpostId)) {
    return null
  }

  const parentId = getParentId(subpostId)
  const allPosts = await getAllPosts()
  return allPosts.find((post) => post.id === parentId) || null
}

export async function getPostById(
  postId: string,
): Promise<CollectionEntry<'thoughts'> | null> {
  const allPosts = await getAllPostsAndSubposts()
  return allPosts.find((post) => post.id === postId) || null
}

export async function getSubpostCount(parentId: string): Promise<number> {
  const subposts = await getSubpostsForParent(parentId)
  return subposts.length
}

export async function getCombinedReadingTime(postId: string): Promise<string> {
  const post = await getPostById(postId)
  if (!post) return readingTime(0)

  if (post.data.readingTimeOverride) {
    return post.data.readingTimeOverride
  }

  let totalWords = calculateWordCountFromHtml(post.body)

  if (!isSubpost(postId)) {
    const subposts = await getSubpostsForParent(postId)
    for (const subpost of subposts) {
      totalWords += calculateWordCountFromHtml(subpost.body)
    }
  }

  return readingTime(totalWords)
}

export async function getPostReadingTime(postId: string): Promise<string> {
  const post = await getPostById(postId)
  if (!post) return readingTime(0)

  if (post.data.readingTimeOverride) {
    return post.data.readingTimeOverride
  }

  const wordCount = calculateWordCountFromHtml(post.body)
  return readingTime(wordCount)
}

export type TOCHeading = {
  slug: string
  text: string
  depth: number
  isSubpostTitle?: boolean
}

export type TOCSection = {
  type: 'parent' | 'subpost'
  title: string
  headings: TOCHeading[]
  subpostId?: string
}

function latexToUnicode(str: string): string {
  let text = str

  // 1. Common fractions: \frac{a}{b} -> a/(b)
  text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/($2)')
  // Remove outer parenthesis if denominator is simple E.g. a/(b) -> a/b
  text = text.replace(/\/ \(([^+\-*\/()]+)\)/g, '/$1')
  text = text.replace(/\/([^+\-*\/()]+)/g, '/$1')

  // 2. Common GREEK letters
  text = text.replace(/\\omega/g, 'ω')
  text = text.replace(/\\theta/g, 'θ')
  text = text.replace(/\\pi/g, 'π')
  text = text.replace(/\\alpha/g, 'α')
  text = text.replace(/\\beta/g, 'β')
  text = text.replace(/\\gamma/g, 'γ')
  text = text.replace(/\\phi/g, 'φ')

  // 3. Superscripts
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ'
  }

  text = text.replace(/\^\{([^{}]+)\}/g, (_, p1) => {
    return p1.split('').map((char: string) => superscripts[char] || char).join('')
  })
  text = text.replace(/\^([0-9nixy])/g, (_, p1) => superscripts[p1] || p1)

  // Subscripts
  const subscripts: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'n': 'ₙ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'x': 'ₓ'
  }
  text = text.replace(/_\{([^{}]+)\}/g, (_, p1) => {
    return p1.split('').map((char: string) => subscripts[char] || char).join('')
  })
  text = text.replace(/_([0-9nijkx])/g, (_, p1) => subscripts[p1] || p1)

  // 4. Mathematical operators and relations
  text = text.replace(/\\ge(q)?/g, '≥')
  text = text.replace(/\\le(q)?/g, '≤')
  text = text.replace(/\\times/g, '×')
  text = text.replace(/\\cdot/g, '·')
  text = text.replace(/\\equiv/g, '≡')
  text = text.replace(/\\pm/g, '±')
  text = text.replace(/\\infty/g, '∞')
  text = text.replace(/\\sqrt/g, '√')

  // 5. Spacing and other modifiers
  text = text.replace(/\\,/g, ' ')
  text = text.replace(/\\;/g, ' ')
  text = text.replace(/\\!/g, '')
  text = text.replace(/\\text\{([^{}]+)\}/g, '$1')

  return text
}

function cleanAstroHeadings(body: string | undefined, astroHeadings: { depth: number; text: string; slug: string }[]) {
  if (!body) return astroHeadings

  // Strip triple backtick code blocks to avoid matches in comments
  const cleanBody = body.replace(/```[\s\S]*?```/g, '')

  const lines = cleanBody.split('\n')
  const rawHeadings: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      rawHeadings.push(match[2].trim())
    }
  }

  return astroHeadings.map((h, i) => {
    const rawText = rawHeadings[i] || h.text
    // Clean up inline math delimiters like `$x$` to `x` and format LaTeX nicely
    const text = rawText.replace(/\$(.*?)\$/g, (_, p1) => latexToUnicode(p1))
    return {
      ...h,
      text,
    }
  })
}

export async function getTOCSections(postId: string): Promise<TOCSection[]> {
  const post = await getPostById(postId)
  if (!post) return []

  const parentId = isSubpost(postId) ? getParentId(postId) : postId
  const parentPost = isSubpost(postId) ? await getPostById(parentId) : post

  if (!parentPost) return []

  const sections: TOCSection[] = []

  const { headings: parentHeadings } = await render(parentPost)
  const cleanedParentHeadings = cleanAstroHeadings(parentPost.body, parentHeadings)
  if (cleanedParentHeadings.length > 0) {
    sections.push({
      type: 'parent',
      title: 'Overview',
      headings: cleanedParentHeadings.map((heading) => ({
        slug: heading.slug,
        text: heading.text,
        depth: heading.depth,
      })),
    })
  }

  const subposts = await getSubpostsForParent(parentId)
  for (const subpost of subposts) {
    const { headings: subpostHeadings } = await render(subpost)
    const cleanedSubpostHeadings = cleanAstroHeadings(subpost.body, subpostHeadings)
    if (cleanedSubpostHeadings.length > 0) {
      sections.push({
        type: 'subpost',
        title: subpost.data.title,
        headings: cleanedSubpostHeadings.map((heading, index) => ({
          slug: heading.slug,
          text: heading.text,
          depth: heading.depth,
          isSubpostTitle: index === 0,
        })),
        subpostId: subpost.id,
      })
    }
  }

  return sections
}

/* Maths Collection Helpers */

export async function getAllMathsPosts(): Promise<CollectionEntry<'maths'>[]> {
  const posts = await getCollection('maths')
  return posts
    .filter((post) => !post.data.draft && !isSubpost(post.id))
    .sort((a, b) => {
      const pinA = a.data.pinned ? 1 : 0
      const pinB = b.data.pinned ? 1 : 0
      if (pinA !== pinB) return pinB - pinA
      return b.data.date.valueOf() - a.data.date.valueOf()
    })
}

export async function getAllMathsPostsAndSubposts(): Promise<
  CollectionEntry<'maths'>[]
> {
  const posts = await getCollection('maths')
  return posts
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

export async function getAdjacentMathsPosts(currentId: string): Promise<{
  newer: CollectionEntry<'maths'> | null
  older: CollectionEntry<'maths'> | null
  parent: CollectionEntry<'maths'> | null
}> {
  const allPosts = await getAllMathsPosts()

  if (isSubpost(currentId)) {
    const parentId = getParentId(currentId)
    const allPosts = await getAllMathsPosts()
    const parent = allPosts.find((post) => post.id === parentId) || null

    const posts = await getCollection('maths')
    const subposts = posts
      .filter(
        (post) =>
          isSubpost(post.id) &&
          getParentId(post.id) === parentId &&
          !post.data.draft,
      )
      .sort((a, b) => {
        const dateDiff = a.data.date.valueOf() - b.data.date.valueOf()
        if (dateDiff !== 0) return dateDiff

        const orderA = a.data.order ?? 0
        const orderB = b.data.order ?? 0
        return orderA - orderB
      })

    const currentIndex = subposts.findIndex((post) => post.id === currentId)
    if (currentIndex === -1) {
      return { newer: null, older: null, parent }
    }

    return {
      newer:
        currentIndex < subposts.length - 1 ? subposts[currentIndex + 1] : null,
      older: currentIndex > 0 ? subposts[currentIndex - 1] : null,
      parent,
    }
  }

  const parentPosts = allPosts.filter((post) => !isSubpost(post.id))
  const currentIndex = parentPosts.findIndex((post) => post.id === currentId)

  if (currentIndex === -1) {
    return { newer: null, older: null, parent: null }
  }

  return {
    newer: currentIndex > 0 ? parentPosts[currentIndex - 1] : null,
    older:
      currentIndex < parentPosts.length - 1
        ? parentPosts[currentIndex + 1]
        : null,
    parent: null,
  }
}

export async function getMathsPostsByTag(
  tag: string,
): Promise<CollectionEntry<'maths'>[]> {
  const posts = await getAllMathsPosts()
  return posts.filter((post) => post.data.tags?.includes(tag))
}

export async function getRecentMathsPosts(
  count: number,
): Promise<CollectionEntry<'maths'>[]> {
  const posts = await getAllMathsPosts()
  return posts.slice(0, count)
}

export async function getSubpostsForMathsParent(
  parentId: string,
): Promise<CollectionEntry<'maths'>[]> {
  const posts = await getCollection('maths')
  return posts
    .filter(
      (post) =>
        !post.data.draft &&
        isSubpost(post.id) &&
        getParentId(post.id) === parentId,
    )
    .sort((a, b) => {
      const dateDiff = a.data.date.valueOf() - b.data.date.valueOf()
      if (dateDiff !== 0) return dateDiff

      const orderA = a.data.order ?? 0
      const orderB = b.data.order ?? 0
      return orderA - orderB
    })
}

export function groupMathsPostsByYear(
  posts: CollectionEntry<'maths'>[],
): Record<string, CollectionEntry<'maths'>[]> {
  return posts.reduce(
    (acc: Record<string, CollectionEntry<'maths'>[]>, post) => {
      const year = post.data.date.getFullYear().toString()
      ;(acc[year] ??= []).push(post)
      return acc
    },
    {},
  )
}

export async function hasMathsSubposts(postId: string): Promise<boolean> {
  const subposts = await getSubpostsForMathsParent(postId)
  return subposts.length > 0
}

export async function getParentMathsPost(
  subpostId: string,
): Promise<CollectionEntry<'maths'> | null> {
  if (!isSubpost(subpostId)) {
    return null
  }

  const parentId = getParentId(subpostId)
  const allPosts = await getAllMathsPosts()
  return allPosts.find((post) => post.id === parentId) || null
}

export async function getMathsPostById(
  postId: string,
): Promise<CollectionEntry<'maths'> | null> {
  const allPosts = await getAllMathsPostsAndSubposts()
  return allPosts.find((post) => post.id === postId) || null
}

export async function getMathsSubpostCount(parentId: string): Promise<number> {
  const subposts = await getSubpostsForMathsParent(parentId)
  return subposts.length
}

export async function getMathsCombinedReadingTime(postId: string): Promise<string> {
  const post = await getMathsPostById(postId)
  if (!post) return readingTime(0, 60)

  if (post.data.readingTimeOverride) {
    return post.data.readingTimeOverride
  }

  let totalWords = calculateWordCountFromHtml(post.body)

  if (!isSubpost(postId)) {
    const subposts = await getSubpostsForMathsParent(postId)
    for (const subpost of subposts) {
      totalWords += calculateWordCountFromHtml(subpost.body)
    }
  }

  return readingTime(totalWords, 60)
}

export async function getMathsPostReadingTime(postId: string): Promise<string> {
  const post = await getMathsPostById(postId)
  if (!post) return readingTime(0, 60)

  if (post.data.readingTimeOverride) {
    return post.data.readingTimeOverride
  }

  const wordCount = calculateWordCountFromHtml(post.body)
  return readingTime(wordCount, 60)
}

export async function getMathsTOCSections(postId: string): Promise<TOCSection[]> {
  const post = await getMathsPostById(postId)
  if (!post) return []

  const parentId = isSubpost(postId) ? getParentId(postId) : postId
  const parentPost = isSubpost(postId) ? await getMathsPostById(parentId) : post

  if (!parentPost) return []

  const sections: TOCSection[] = []

  const { headings: parentHeadings } = await render(parentPost)
  const cleanedParentHeadings = cleanAstroHeadings(parentPost.body, parentHeadings)
  if (cleanedParentHeadings.length > 0) {
    sections.push({
      type: 'parent',
      title: 'Overview',
      headings: cleanedParentHeadings.map((heading) => ({
        slug: heading.slug,
        text: heading.text,
        depth: heading.depth,
      })),
    })
  }

  const subposts = await getSubpostsForMathsParent(parentId)
  for (const subpost of subposts) {
    const { headings: subpostHeadings } = await render(subpost)
    const cleanedSubpostHeadings = cleanAstroHeadings(subpost.body, subpostHeadings)
    if (cleanedSubpostHeadings.length > 0) {
      sections.push({
        type: 'subpost',
        title: subpost.data.title,
        headings: cleanedSubpostHeadings.map((heading, index) => ({
          slug: heading.slug,
          text: heading.text,
          depth: heading.depth,
          isSubpostTitle: index === 0,
        })),
        subpostId: subpost.id,
      })
    }
  }

  return sections
}
