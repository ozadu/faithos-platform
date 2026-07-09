const internalApiUrl = process.env.INTERNAL_API_URL ?? 'http://api:3001';
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function toApiPath(path: string[]): string {
  if (path.join('/') === 'health') return '/health';

  return `/api/v1/${path.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

function requestHeaders(request: Request): Headers {
  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');

  if (authorization) headers.set('authorization', authorization);
  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);

  return headers;
}

function responseHeaders(response: Response): Headers {
  const headers = new Headers();

  for (const name of ['content-disposition', 'content-type', 'cache-control']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

async function proxy(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { path } = await context.params;
  const requestUrl = new URL(request.url);
  const apiPath = `${toApiPath(path)}${requestUrl.search}`;
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer();

  const bases = [internalApiUrl, publicApiUrl].filter(
    (base, index, list) => list.indexOf(base) === index,
  );
  let lastError: unknown;

  for (const base of bases) {
    try {
      const init: RequestInit = {
        cache: 'no-store',
        headers: requestHeaders(request),
        method: request.method,
      };

      if (body) init.body = body;

      const response = await fetch(`${base}${apiPath}`, init);

      return new Response(await response.arrayBuffer(), {
        headers: responseHeaders(response),
        status: response.status,
        statusText: response.statusText,
      });
    } catch (error) {
      lastError = error;
    }
  }

  return Response.json(
    {
      message:
        lastError instanceof Error
          ? lastError.message
          : 'API proxy request failed',
      success: false,
    },
    { status: 502 },
  );
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
