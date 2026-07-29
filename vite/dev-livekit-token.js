import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AccessToken, AgentDispatchClient } from 'livekit-server-sdk'
import { RoomConfiguration } from '@livekit/protocol'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env') })

function livekitHttpUrl() {
  const url = process.env.LIVEKIT_URL || 'wss://hireme-khyjrqi7.livekit.cloud'
  return url.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://')
}

function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolveBody(data ? JSON.parse(data) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

async function mintInterviewToken({ name, role, userId, sortKey }) {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in .env')
  }

  // Fresh room per session so a crashed agent job does not block the next interview.
  const roomName = `interview-${randomUUID().slice(0, 8)}`
  // user_id travels to the agent so it knows which user the feedback belongs to.
  const metadata = JSON.stringify({
    agent_name: 'my-agent',
    name: name || 'Candidate',
    role: role || 'General Position',
    user_id: userId || '',
    sort_key: sortKey || '',
  })

  const token = new AccessToken(apiKey, apiSecret, {
    identity: 'maya',
    name: name || 'Candidate',
    metadata,
    ttl: '6h',
  })

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  token.roomConfig = new RoomConfiguration({
    agents: [{ agentName: 'my-agent', metadata }],
  })

  const dispatchClient = new AgentDispatchClient(livekitHttpUrl(), apiKey, apiSecret)
  await dispatchClient.createDispatch(roomName, 'my-agent', { metadata })

  return { token: await token.toJwt(), room: roomName }
}

export function devLivekitTokenPlugin() {
  return {
    name: 'dev-livekit-token',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/livekit-token') || req.method !== 'POST') {
          next()
          return
        }

        try {
          const body = await readJsonBody(req)
          const result = await mintInterviewToken({
            name: body.name,
            role: body.role,
            userId: body.userId,
            sortKey: body.sortKey,
          })
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || String(err) }))
        }
      })
    },
  }
}
