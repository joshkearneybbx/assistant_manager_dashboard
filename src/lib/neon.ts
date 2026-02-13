import { neon } from '@neondatabase/serverless';

const databaseUrl = import.meta.env.VITE_NEON_DATABASE_URL as string | undefined;

if (!databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('Missing VITE_NEON_DATABASE_URL env var');
}
if (databaseUrl?.includes('/rest/v1')) {
  // eslint-disable-next-line no-console
  console.error('VITE_NEON_DATABASE_URL appears to be a PostgREST URL. Use a PostgreSQL connection string instead.');
}

function normalizeDatabaseUrl(input: string | undefined): string {
  if (!input) return '';
  try {
    const parsed = new URL(input);
    parsed.searchParams.delete('channel_binding');
    return parsed.toString();
  } catch {
    return input;
  }
}

const neonSql = neon(normalizeDatabaseUrl(databaseUrl), { disableWarningInBrowsers: true });
const shouldLogSql = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_SQL === 'true');

function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeSqlParam(value: unknown): unknown {
  if (value instanceof Date) {
    const normalized = toDateOnlyString(value);
    // eslint-disable-next-line no-console
    console.warn('[neon/sql] Date param converted to YYYY-MM-DD string:', normalized);
    return normalized;
  }
  return value;
}

function escapeSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (Array.isArray(value)) {
    return `ARRAY[${value.map((v) => escapeSqlLiteral(v)).join(', ')}]`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function compileSqlForLog(strings: TemplateStringsArray, values: unknown[]): string {
  let query = '';
  for (let index = 0; index < strings.length; index += 1) {
    query += strings[index];
    if (index < values.length) {
      query += escapeSqlLiteral(values[index]);
    }
  }
  return query.replace(/\s+/g, ' ').trim();
}

async function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const normalizedValues = values.map(normalizeSqlParam);
  const compiled = compileSqlForLog(strings, normalizedValues);

  if (shouldLogSql) {
    // eslint-disable-next-line no-console
    console.info('[neon/sql:query]', compiled);
  }

  try {
    const result = await neonSql(strings, ...normalizedValues);
    return result as T[];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[neon/sql:error]', compiled, { values: normalizedValues, error });
    throw error;
  }
}

export { sql };
