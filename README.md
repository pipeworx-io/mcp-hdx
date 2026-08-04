# mcp-hdx

Humanitarian Data Exchange (HDX) MCP — data.humdata.org, the open

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Hdx data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
