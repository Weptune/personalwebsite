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

  const htmlContent = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111; line-height: 1.6;">
      <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
        weptune &bull; new write-up
      </div>
      <h2 style="font-size: 24px; font-weight: normal; font-style: italic; margin-bottom: 16px; color: #111;">
        ${title}
      </h2>
      <p style="color: #444; font-size: 15px; margin-bottom: 24px;">
        ${summary}
      </p>
      <div style="margin-bottom: 30px;">
        <a href="${postUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">
          Read full write-up &rarr;
        </a>
      </div>
      <div style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 16px; font-style: italic;">
        You received this email because you subscribed to write-ups on <a href="${SITE_URL}" style="color: #666; text-decoration: underline;">weptune</a>.
      </div>
    </div>
  `

  console.log(`Sending broadcast for "${title}" to ${subscribers.length} subscriber(s)...`)
  await sendEmail({
    to: subscribers,
    subject: `New Write-up: ${title}`,
    html: htmlContent,
  })
}

main()
