/**
 * Mockup de Express para pruebas unitarias
 */

export interface MockRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface MockResponse {
  statusCode: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface MockNextFunction {
  (error?: unknown): void;
}

/**
 * Crea un mock de Request.
 */
export function createMockRequest(overrides?: Partial<MockRequest>): MockRequest {
  return {
    method: 'GET',
    url: '/',
    headers: {},
    ...overrides,
  };
}

/**
 * Crea un mock de Response.
 */
export function createMockResponse(): {
  status: (code: number) => MockResponseMock;
  json: (body: unknown) => MockResponseMock;
  send: (body: unknown) => MockResponseMock;
  sendFile: (path: string) => MockResponseMock;
  redirect: (url: string) => MockResponseMock;
  getMock: () => MockResponse;
} {
  const response: MockResponse = {
    statusCode: 200,
    headers: {},
  };

  const MockResponseMock = {
    status(code: number) {
      response.statusCode = code;
      return MockResponseMock;
    },
    json(body: unknown) {
      response.body = body;
      return MockResponseMock;
    },
    send(body: unknown) {
      response.body = body;
      return MockResponseMock;
    },
    sendFile(path: string) {
      response.body = { path };
      return MockResponseMock;
    },
    redirect(url: string) {
      response.body = { redirect: url };
      return MockResponseMock;
    },
    getMock() {
      return { ...response };
    },
  };

  return MockResponseMock;
}

/**
 * Crea un mock de Next function.
 */
export function createMockNext(): {
  called: boolean;
  call: (error?: unknown) => void;
} {
  let called = false;
  return {
    get called() {
      return called;
    },
    call(error?: unknown) {
      called = true;
    },
  };
}

export default {
  createMockRequest,
  createMockResponse,
  createMockNext,
};