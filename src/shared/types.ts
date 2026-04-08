export interface MockRule {
  id: string
  name: string
  enabled: boolean
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ANY'
  urlPattern: string
  statusCode: number
  responseBody: string
  responseHeaders: Array<{ key: string; value: string }>
  delayMs: number
  createdAt: number
}

export interface ExtensionSettings {
  extensionEnabled: boolean
}
