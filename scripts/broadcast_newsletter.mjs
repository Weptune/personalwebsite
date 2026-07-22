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
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || 'newsletter@resend.dev'

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

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      console.error(`Resend API Error [${res.status}]:`, await res.text())
      return false
    }

    const data = await res.json()
    console.log(`Email sent successfully! ID: ${data.id}`)
    return true
  } catch (err) {
    console.error('Failed to send email:', err.message)
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const title = args[0]
  const postUrl = args[1]
  const summary = args[2] || 'Check out the latest post on the website!'

  if (!title || !postUrl) {
    console.log(`
Usage:
  npm run broadcast "<Post Title>" "<Post URL>" "[Optional Summary]"

Example:
  npm run broadcast "Identity Politics" "https://yourdomain.com/thoughts/identity-politics" "A new post on identity politics."
`)
    process.exit(1)
  }

  console.log(`Fetching subscribers from Supabase...`)
  const subscribers = await getSubscribers()

  if (subscribers.length === 0) {
    console.log('No subscribers found in database.')
    return
  }

  console.log(`Found ${subscribers.length} subscriber(s): ${subscribers.join(', ')}`)

  const htmlContent = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111; line-height: 1.6;">
      <h2 style="font-size: 22px; font-weight: normal; font-style: italic; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        ${title}
      </h2>
      <p style="color: #444; font-size: 15px;">
        ${summary}
      </p>
      <div style="margin-top: 25px;">
        <a href="${postUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 4px; font-size: 14px;">
          Read post &rarr;
        </a>
      </div>
    </div>
  `

  console.log(`Sending broadcast to ${subscribers.length} subscriber(s)...`)
  await sendEmail({
    to: subscribers,
    subject: `New Post: ${title}`,
    html: htmlContent,
  })
}

main()
