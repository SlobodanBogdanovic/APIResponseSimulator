import http from 'node:http'
import process from 'node:process'

// Absolute URLs: the interceptor matches the URL string it is given. A relative
// "/api/users" does not contain the host the rules use.
const ORIGIN = 'http://127.0.0.1:4173'

const probePage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Probe</title>
</head>
<body>
  <button type="button" data-testid="fetch-get-users">GET /api/users</button>
  <button type="button" data-testid="fetch-get-other">GET /api/other</button>
  <button type="button" data-testid="fetch-post-users">POST /api/users</button>
  <button type="button" data-testid="fetch-get-special">GET /api/a.b(c)</button>
  <button type="button" data-testid="xhr-get-users">XHR GET /api/users</button>
  <pre data-testid="probe-result" data-seq="0"></pre>
  <script>
    const ORIGIN = ${JSON.stringify(ORIGIN)}
    let seq = 0
    const resultEl = document.querySelector('[data-testid="probe-result"]')

    function begin() {
      seq += 1
      resultEl.dataset.pending = String(seq)
      resultEl.textContent = ''
      return seq
    }

    function finish(n, payload) {
      resultEl.dataset.seq = String(n)
      resultEl.textContent = JSON.stringify(payload)
    }

    async function runFetch(path, method) {
      const n = begin()
      const res = await fetch(ORIGIN + path, { method })
      const body = await res.text()
      finish(n, {
        status: res.status,
        body,
        contentType: res.headers.get('content-type'),
        mockHeader: res.headers.get('X-Mock-Test'),
        serverHeader: res.headers.get('X-From-Server'),
        events: [],
      })
    }

    function runXhr() {
      const n = begin()
      const xhr = new XMLHttpRequest()
      const events = []
      xhr.open('GET', ORIGIN + '/api/users')
      xhr.addEventListener('readystatechange', () => { events.push('readystatechange') })
      xhr.addEventListener('load', () => { events.push('load') })
      xhr.addEventListener('loadend', () => {
        events.push('loadend')
        let contentType = null
        let mockHeader = null
        let serverHeader = null
        try {
          contentType = xhr.getResponseHeader('Content-Type')
          mockHeader = xhr.getResponseHeader('X-Mock-Test')
          serverHeader = xhr.getResponseHeader('X-From-Server')
        } catch (err) {
          contentType = null
        }
        finish(n, {
          status: xhr.status,
          body: xhr.responseText,
          contentType,
          mockHeader,
          serverHeader,
          events,
        })
      })
      xhr.send()
    }

    document.querySelector('[data-testid="fetch-get-users"]').addEventListener('click', () => {
      runFetch('/api/users', 'GET')
    })
    document.querySelector('[data-testid="fetch-get-other"]').addEventListener('click', () => {
      runFetch('/api/other', 'GET')
    })
    document.querySelector('[data-testid="fetch-post-users"]').addEventListener('click', () => {
      runFetch('/api/users', 'POST')
    })
    document.querySelector('[data-testid="fetch-get-special"]').addEventListener('click', () => {
      runFetch('/api/a.b(c)', 'GET')
    })
    document.querySelector('[data-testid="xhr-get-users"]').addEventListener('click', () => {
      runXhr()
    })
  </script>
</body>
</html>
`

function send(res, status, headers, body) {
  res.writeHead(status, headers)
  res.end(body)
}

const server = http.createServer((req, res) => {
  req.resume()
  const pathname = new URL(req.url ?? '/', ORIGIN).pathname

  if (req.method === 'GET' && pathname === '/') {
    send(res, 200, { 'Content-Type': 'text/html; charset=utf-8' }, probePage)
    return
  }

  if (pathname.startsWith('/api/')) {
    const body = JSON.stringify({
      source: 'server',
      method: req.method,
      path: pathname,
    })
    send(res, 200, {
      'Content-Type': 'application/json',
      'X-From-Server': 'yes',
    }, body)
    return
  }

  send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'not found')
})

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    process.stderr.write('4173 is in use\n')
  } else {
    process.stderr.write(`${err}\n`)
  }
  process.exit(1)
})

server.listen(4173, '127.0.0.1')
