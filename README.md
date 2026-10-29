# mcp-hdx

Humanitarian Data Exchange (HDX) MCP — data.humdata.org, the open humanitarian-data platform run by UN OCHA on CKAN.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1856+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

## Tools

| Tool | Description |
|------|-------------|
| `search_datasets` | Search the Humanitarian Data Exchange catalogue (CKAN package_search) for datasets on displacement, refugees, food security, conflict, disasters, health, population, etc. Returns matching datasets with titles, descriptions, publishing organization, locations (groups), and resources. Filter by country/crisis with fq="groups:<iso3>" (e.g. "groups:syr") — get codes from list_locations. |
| `dataset_details` | Full dataset record by id or slug (CKAN package_show), including its resources. Each resource has a "download_url"/"url" pointing at the actual data file (usually CSV/XLSX) — that is how you read the underlying rows, since HDX does not expose a keyless row query. |
| `list_locations` | List the locations on HDX (CKAN group_list) — countries and crises, each keyed by a lowercase ISO3 code (e.g. {"name":"syr","display_name":"Syrian Arab Republic"}). Use a code as fq="groups:<name>" in search_datasets to scope results to a country/crisis. |
| `list_organizations` | List the publishing organizations on HDX (CKAN organization_list) — UN agencies and NGOs such as OCHA, UNHCR, WFP, IDMC, ACAPS. Use an org "name" as fq="organization:<name>" in search_datasets. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "hdx": {
      "url": "https://gateway.pipeworx.io/hdx/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/hdx/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1856+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/hdx_search_datasets \
  -H 'Content-Type: application/json' \
  -d '{"query":"displacement refugees"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/hdx_search_datasets`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-hdx` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/hdx/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "hdx": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-hdx"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Hdx data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
