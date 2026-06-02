interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Humanitarian Data Exchange (HDX) MCP — data.humdata.org, the open
 * humanitarian-data platform run by UN OCHA on CKAN.
 *
 * Auth: none (keyless). CKAN API docs: https://docs.ckan.org/en/latest/api/
 *
 * What's here: humanitarian datasets — internal displacement & refugees,
 * food security, conflict events & fatalities, disasters, health, population
 * (HXL-tagged tabular data, mostly CSV/XLSX). Publishers include OCHA, UNHCR,
 * WFP, IDMC, ACAPS, ACLED and hundreds of NGOs.
 *
 * Notes for callers:
 * - CKAN wraps every response as {success, result}. These tools UNWRAP it and
 *   return `result` directly; a {success:false} body is turned into an error.
 * - On HDX, CKAN "groups" are LOCATIONS — countries and crises, keyed by their
 *   lowercase ISO3 code (e.g. "afg" Afghanistan, "syr" Syria, "pak" Pakistan).
 *   Filter searches by location with fq="groups:syr". "organizations" are the
 *   publishing agencies/NGOs.
 * - There is NO row-level datastore_query here: HDX's CKAN datastore_search
 *   requires an authenticated user (verified — returns "Authorization Error").
 *   Instead, dataset_details returns each resource's `download_url`/`url`
 *   (direct CSV/XLSX), which is how you read the actual data.
 */


const BASE = 'https://data.humdata.org/api/3/action';
const UA = 'pipeworx-mcp-hdx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_datasets',
    description:
      'Search the Humanitarian Data Exchange catalogue (CKAN package_search) for datasets on displacement, refugees, food security, conflict, disasters, health, population, etc. Returns matching datasets with titles, descriptions, publishing organization, locations (groups), and resources. Filter by country/crisis with fq="groups:<iso3>" (e.g. "groups:syr") — get codes from list_locations.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms, e.g. "displacement", "food security", "conflict fatalities".' },
        fq: {
          type: 'string',
          description:
            'Solr filter query (facet filter). e.g. "groups:syr" (location = Syria), "organization:unhcr", "res_format:CSV". Combine with spaces.',
        },
        rows: { type: 'number', description: 'Max results, 1-1000 (default 25).' },
        start: { type: 'number', description: '0-based offset for paging.' },
        sort: { type: 'string', description: 'Sort spec, e.g. "metadata_modified desc" or "score desc".' },
      },
      required: ['query'],
    },
  },
  {
    name: 'dataset_details',
    description:
      'Full dataset record by id or slug (CKAN package_show), including its resources. Each resource has a "download_url"/"url" pointing at the actual data file (usually CSV/XLSX) — that is how you read the underlying rows, since HDX does not expose a keyless row query.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Dataset id or slug, e.g. "idmc-idp-data-pak".' } },
      required: ['id'],
    },
  },
  {
    name: 'list_locations',
    description:
      'List the locations on HDX (CKAN group_list) — countries and crises, each keyed by a lowercase ISO3 code (e.g. {"name":"syr","display_name":"Syrian Arab Republic"}). Use a code as fq="groups:<name>" in search_datasets to scope results to a country/crisis.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max locations, 1-1000 (default 300; HDX has ~250).' } },
    },
  },
  {
    name: 'list_organizations',
    description:
      'List the publishing organizations on HDX (CKAN organization_list) — UN agencies and NGOs such as OCHA, UNHCR, WFP, IDMC, ACAPS. Use an org "name" as fq="organization:<name>" in search_datasets.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max organizations, 1-1000 (default 100).' } },
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_datasets': {
      const params = new URLSearchParams({
        q: reqStr(args, 'query', '"displacement" or "food security"'),
        rows: String(clamp(args.rows, 25, 1, 1000)),
        start: String(Math.max(0, (args.start as number) ?? 0)),
      });
      if (args.fq) params.set('fq', String(args.fq));
      if (args.sort) params.set('sort', String(args.sort));
      return ckanGet(`/package_search?${params}`);
    }
    case 'dataset_details':
      return ckanGet(`/package_show?id=${encodeURIComponent(reqStr(args, 'id', '"idmc-idp-data-pak"'))}`);
    case 'list_locations': {
      const params = new URLSearchParams({ all_fields: 'true', limit: String(clamp(args.limit, 300, 1, 1000)) });
      return ckanGet(`/group_list?${params}`);
    }
    case 'list_organizations': {
      const params = new URLSearchParams({ all_fields: 'true', limit: String(clamp(args.limit, 100, 1, 1000)) });
      return ckanGet(`/organization_list?${params}`);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function ckanGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HDX: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  const json = (await res.json()) as { success?: boolean; error?: { message?: string }; result?: unknown };
  if (json.success === false) throw new Error(`HDX: ${json.error?.message ?? 'request failed'}`);
  return json.result ?? json;
}

function clamp(v: unknown, dflt: number, lo: number, hi: number): number {
  const n = typeof v === 'number' ? v : dflt;
  return Math.min(hi, Math.max(lo, n));
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
