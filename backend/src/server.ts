import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { runAuto } from './model/autoRun'
import { SimulationEngine } from './model/SimulationEngine'
import type { SimulationConfig } from './model/types'
import { validateConfig } from './validateConfig'

const PORT = Number(process.env.PORT ?? 3000)
const MAX_BODY_BYTES = 10_000

/** Пошаговые прогоны хранятся в памяти до перезапуска сервера */
const sessions = new Map<string, SimulationEngine>()

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > MAX_BODY_BYTES) reject(new Error('Слишком большой запрос'))
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null)
      } catch {
        reject(new Error('Некорректный JSON'))
      }
    })
  })
}

function send(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

async function readConfig(req: IncomingMessage, res: ServerResponse): Promise<SimulationConfig | null> {
  const body = await readJson(req)
  const error = validateConfig(body)
  if (error) {
    send(res, 400, { error })
    return null
  }
  return body as SimulationConfig
}

/**
 * POST /api/simulations           — создать пошаговый прогон → { id }
 * POST /api/simulations/:id/step  — следующий шаг → { step, report }; step = null, когда система пуста
 * POST /api/auto                  — автоматический режим → { report, iterations }
 */
async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url ?? ''
  if (req.method !== 'POST') return send(res, 405, { error: 'Поддерживается только POST' })

  if (url === '/api/simulations') {
    const config = await readConfig(req, res)
    if (!config) return
    const engine = new SimulationEngine(config)
    engine.initialize()
    const id = randomUUID()
    sessions.set(id, engine)
    return send(res, 201, { id })
  }

  const stepMatch = url.match(/^\/api\/simulations\/([\w-]+)\/step$/)
  if (stepMatch) {
    const engine = sessions.get(stepMatch[1])
    if (!engine) return send(res, 404, { error: 'Прогон не найден' })
    const step = engine.step()
    if (step === null) sessions.delete(stepMatch[1])
    return send(res, 200, { step, report: step === null ? engine.report() : null })
  }

  if (url === '/api/auto') {
    const config = await readConfig(req, res)
    if (!config) return
    return send(res, 200, runAuto(config))
  }

  send(res, 404, { error: 'Неизвестный адрес' })
}

createServer((req, res) => {
  handle(req, res).catch((error: Error) => send(res, 400, { error: error.message }))
}).listen(PORT, () => console.log(`Сервер модели: http://localhost:${PORT}`))
