import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// --- Treasury strategies schemas (issue #997) ---
// Numeric/BIGINT/NUMERIC columns are returned as strings by the `pg` driver
// to avoid precision loss, matching every other indexed row in this API.

const PaginationSchema = z
  .object({
    limit: z.number().int().openapi({ example: 20 }),
    offset: z.number().int().openapi({ example: 0 }),
    hasMore: z.boolean().openapi({ example: false }),
  })
  .openapi('Pagination');

const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'Internal server error' }),
  })
  .openapi('Error');

const TreasuryStrategySchema = z
  .object({
    strategy_id: z.string().openapi({ example: '1' }),
    adapter: z.string().openapi({ example: 'CADAPTER...' }),
    token: z.string().openapi({ example: 'CTOKEN...' }),
    active: z.boolean().openapi({ example: true }),
    current_allocation: z.string().openapi({ example: '1000000000' }),
    registered_ledger: z.number().int().openapi({ example: 123456 }),
    created_at: z.string().openapi({ example: '2026-01-01T00:00:00.000Z' }),
  })
  .openapi('TreasuryStrategy');

const StrategyWithdrawalSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    withdrawal_id: z.string().openapi({ example: '1' }),
    strategy_id: z.string().openapi({ example: '1' }),
    amount: z.string().openapi({ example: '500000000' }),
    actual_amount: z.string().nullable().openapi({ example: null }),
    requested_ledger: z.number().int().openapi({ example: 123000 }),
    claimable_ledger: z.number().int().openapi({ example: 123500 }),
    claimed_ledger: z.number().int().nullable().openapi({ example: null }),
    created_at: z.string().openapi({ example: '2026-01-01T00:00:00.000Z' }),
    status: z
      .enum(['pending', 'claimable', 'claimed'])
      .openapi({ example: 'pending' }),
  })
  .openapi('StrategyWithdrawal');

const StrategyPerformancePointSchema = z
  .object({
    amount: z.string().openapi({ example: '1000000000' }),
    ledger: z.number().int().openapi({ example: 123456 }),
    created_at: z.string().openapi({ example: '2026-01-01T00:00:00.000Z' }),
  })
  .openapi('StrategyPerformancePoint');

registry.registerPath({
  method: 'get',
  path: '/treasury-strategies',
  summary: 'List indexed treasury strategies',
  description:
    'Filterable, paginated list of registered treasury strategies. Backs the SDK\'s TreasuryStrategiesClient.listStrategies.',
  request: {
    query: z.object({
      token: z.string().optional().openapi({ example: 'CTOKEN...' }),
      active: z.enum(['true', 'false']).optional(),
      limit: z.string().optional().openapi({ example: '20' }),
      offset: z.string().optional().openapi({ example: '0' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of treasury strategies.',
      content: {
        'application/json': {
          schema: z.object({
            strategies: z.array(TreasuryStrategySchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid pagination parameters.',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    500: {
      description: 'Internal server error.',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/treasury-strategies/withdrawals',
  summary: 'List treasury strategy withdrawals',
  description:
    'Filterable, paginated list of strategy withdrawal requests. `claimable` is derived against the indexer\'s own last-indexed ledger.',
  request: {
    query: z.object({
      status: z.enum(['pending', 'claimable', 'claimed']).optional(),
      strategy_id: z.string().optional().openapi({ example: '1' }),
      limit: z.string().optional().openapi({ example: '20' }),
      offset: z.string().optional().openapi({ example: '0' }),
    }),
  },
  responses: {
    200: {
      description: 'Paginated list of strategy withdrawals.',
      content: {
        'application/json': {
          schema: z.object({
            withdrawals: z.array(StrategyWithdrawalSchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid pagination parameters or status filter.',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    500: {
      description: 'Internal server error.',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/treasury-strategies/{id}',
  summary: 'Get a treasury strategy by id',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '1' }),
    }),
  },
  responses: {
    200: {
      description: 'The treasury strategy.',
      content: { 'application/json': { schema: TreasuryStrategySchema } },
    },
    404: {
      description: 'Strategy not found.',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    500: {
      description: 'Internal server error.',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/treasury-strategies/{id}/performance',
  summary: 'Get a treasury strategy\'s performance history',
  description:
    'Indexed principal-deposited time series for a strategy. Principal only — does not include accrued yield or loss, which requires a live on-chain read via the SDK\'s TreasuryStrategiesClient.getTotalValue. Backs TreasuryStrategiesClient.getPerformanceHistory.',
  request: {
    params: z.object({
      id: z.string().openapi({ example: '1' }),
    }),
    query: z.object({
      limit: z.string().optional().openapi({ example: '50' }),
      offset: z.string().optional().openapi({ example: '0' }),
    }),
  },
  responses: {
    200: {
      description: "Paginated principal-deposited history.",
      content: {
        'application/json': {
          schema: z.object({
            principal_history: z.array(StrategyPerformancePointSchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid pagination parameters.',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    404: {
      description: 'Strategy not found.',
      content: { 'application/json': { schema: ErrorSchema } },
    },
    500: {
      description: 'Internal server error.',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

export function getRegisteredGetPaths(app: { _router?: { stack?: any[] } }): string[] {
  const paths = new Set<string>();
  for (const layer of app._router?.stack ?? []) {
    if (!layer.route || !layer.route.methods?.get) continue;
    const path = String(layer.route.path);
    if (path !== "/openapi.json" && !path.startsWith("/docs")) paths.add(path);
  }
  return [...paths].sort();
}

export function generateOpenApiDocument(app?: { _router?: { stack?: any[] } }) {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'NebGov Indexer API',
      description: 'REST API for NebGov indexer',
    },
    servers: [{ url: '/api' }],
  });

  // Keep the specification representative even when a route has not yet
  // received a dedicated Zod schema. Dedicated registrations above take
  // precedence; these entries still expose path parameters, success, and
  // standard error responses instead of silently omitting the route.
  for (const route of getRegisteredGetPaths(app ?? {})) {
    const path = route.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
    if (document.paths[path]?.get) continue;
    const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map(([_, name]) => ({
      name,
      in: 'path' as const,
      required: true,
      schema: { type: 'string' as const },
    }));
    document.paths[path] = {
      get: {
        summary: `GET ${route}`,
        parameters,
        responses: {
          200: { description: 'Successful response.' },
          400: { description: 'Invalid request.' },
          404: { description: 'Resource not found.' },
          500: { description: 'Internal server error.' },
        },
      },
    };
  }
  return document;
}
