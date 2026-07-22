import fs from 'fs'
import path from 'path'

// Load .env if present
try {
  if (fs.existsSync('.env')) {
    const envFile = fs.readFileSync('.env', 'utf8')
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=')
        process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  }
} catch {}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || 'weptune <onboarding@resend.dev>'
const SITE_URL = process.env.SITE_URL || 'https://weptune.vercel.app'

// Allowed collections strictly limited to thoughts and maths write-ups
const ALLOWED_COLLECTIONS = ['thoughts', 'maths']

function parseFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!match) return null

    const yaml = match[1]
    const data = {}
    for (const line of yaml.split('\n')) {
      const [k, ...v] = line.split(':')
      if (k && v.length) {
        let val = v.join(':').trim().replace(/^["']|["']$/g, '')
        data[k.trim()] = val
      }
    }
    return data
  } catch {
    return null
  }
}

function findLatestPost() {
  let latestPost = null
  let maxTime = 0

  for (const collection of ALLOWED_COLLECTIONS) {
    const dir = path.join('src', 'content', collection)
    if (!fs.existsSync(dir)) continue

    function scanDir(currentDir) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        if (entry.isDirectory()) {
          scanDir(fullPath)
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
          const fm = parseFrontmatter(fullPath)
          const relPath = path.relative(dir, fullPath).replace(/\\/g, '/')
          const slug = relPath.replace(/\.(md|mdx)$/, '').replace(/\/index$/, '')

          let time = fs.statSync(fullPath).mtimeMs
          if (fm && fm.date) {
            const parsedDate = new Date(fm.date).getTime()
            if (!isNaN(parsedDate)) time = parsedDate
          }

          if (time > maxTime) {
            maxTime = time
            latestPost = {
              collection,
              slug,
              title: fm?.title || slug,
              description: fm?.description || 'A new write-up on the website!',
              date: fm?.date || new Date(time).toISOString(),
              url: `${SITE_URL}/${collection}/${slug}`,
            }
          }
        }
      }
    }

    scanDir(dir)
  }

  return latestPost
}

async function getSubscribers() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Error: PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY is missing in .env')
    return []
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?select=email`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch subscribers: ${await res.text()}`)
    }
    const data = await res.json()
    return Array.isArray(data) ? data.map((d) => d.email).filter(Boolean) : []
  } catch (err) {
    console.error('Error fetching subscribers:', err.message)
    return []
  }
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.error('Error: RESEND_API_KEY is missing in .env. Please set RESEND_API_KEY=re_123...')
    return false
  }

  const recipients = Array.isArray(to) ? to : [to]
  let successCount = 0

  for (const recipient of recipients) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: recipient,
          subject,
          html,
        }),
      })

      if (!res.ok) {
        console.error(`[Resend Notice for ${recipient}]:`, await res.text())
      } else {
        const data = await res.json()
        console.log(`Email successfully sent to ${recipient}! (ID: ${data.id})`)
        successCount++
      }
    } catch (err) {
      console.error(`Failed to send email to ${recipient}:`, err.message)
    }
  }

  return successCount > 0
}

async function main() {
  const args = process.argv.slice(2)
  let title = args[0]
  let postUrl = args[1]
  let summary = args[2]

  if (!title || !postUrl) {
    console.log('No post specified. Scanning for the latest thought or maths write-up...')
    const latest = findLatestPost()
    if (!latest) {
      console.error('No thoughts or maths write-ups found in src/content/thoughts or src/content/maths.')
      process.exit(1)
    }

    title = latest.title
    postUrl = latest.url
    summary = summary || latest.description
    console.log(`Auto-detected latest write-up: "${title}" (${latest.collection})`)
  }

  // Filter enforcement: ensure URL belongs to thoughts or maths ONLY
  const isThoughtOrMaths = postUrl.includes('/thoughts/') || postUrl.includes('/maths/')
  if (!isThoughtOrMaths) {
    console.log(`
[Broadcast Filtered] Subscriptions are strictly configured for Thoughts and Maths write-ups.
Post URL "${postUrl}" does not belong to /thoughts/ or /maths/. Skipping broadcast.
`)
    process.exit(0)
  }

  console.log(`Fetching subscribers from Supabase...`)
  const subscribers = await getSubscribers()

  if (subscribers.length === 0) {
    console.log('No subscribers found in database.')
    return
  }

  console.log(`Found ${subscribers.length} subscriber(s): ${subscribers.join(', ')}`)

  const isMaths = postUrl.includes('/maths/')
  const categoryLabel = isMaths ? 'Maths Write-up' : 'Thought Write-up'
  const subjectTag = isMaths ? 'New Maths Write-up' : 'New Thought'

  const htmlContent = `
    <div style="background-color: #090511; padding: 40px 16px; font-family: Georgia, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #130b22; border: 1px solid #2e1d4d; border-radius: 12px; padding: 32px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        
        <!-- Header Category Badge -->
        <div style="display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #c4b5fd; font-weight: 600; background-color: rgba(196, 181, 253, 0.1); border: 1px solid rgba(196, 181, 253, 0.2); padding: 4px 10px; border-radius: 9999px; margin-bottom: 20px;">
          WEPTUNE &bull; ${categoryLabel}
        </div>

        <!-- Post Title -->
        <h1 style="font-size: 26px; font-weight: normal; font-style: italic; color: #ffffff; margin: 0 0 16px 0; line-height: 1.35;">
          ${title}
        </h1>

        <!-- Post Summary Callout Box -->
        <div style="background-color: rgba(255, 255, 255, 0.03); border-left: 3px solid #a855f7; padding: 14px 18px; margin: 20px 0 28px 0; border-radius: 0 8px 8px 0; color: #e9d5ff; font-size: 15px; font-style: italic; line-height: 1.6;">
          ${summary}
        </div>

        <!-- CTA Button -->
        <div style="margin-bottom: 32px;">
          <a href="${postUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-size: 14px; font-weight: 600; letter-spacing: 0.02em; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);">
            Read write-up on weptune &rarr;
          </a>
        </div>

        <!-- Footer Note -->
        <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #2e1d4d; padding-top: 20px; font-style: italic; line-height: 1.5;">
          You received this email notification because you subscribed to new write-ups on <a href="${SITE_URL}" style="color: #c4b5fd; text-decoration: underline;">weptune</a>.
        </div>

      </div>
    </div>
  `

  console.log(`Sending broadcast for "${title}" to ${subscribers.length} subscriber(s)...`)
  await sendEmail({
    to: subscribers,
    subject: `[weptune] ${subjectTag}: ${title}`,
    html: htmlContent,
  })
}

main()
