import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js"; // <--- INI KUNCI UTAMANYA

// Inisialisasi Server dengan capabilities tools
const server = new Server(
  { name: "searxng", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Mendaftarkan Tool menggunakan Schema resmi
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "search", // Gunakan nama "search" agar selaras dengan Hermes
    description: "Search the web using SearXNG for real-time news and information.",
    inputSchema: {
      type: "object",
      properties: { 
        query: { 
          type: "string",
          description: "The search query to look up on the internet."
        } 
      },
      required: ["query"]
    }
  }]
}));

// Mengeksekusi Tool
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  // Pastikan tool yang dipanggil adalah 'search'
  if (req.params.name !== "search") {
    throw new Error(`Unknown tool: ${req.params.name}`);
  }

  const query = req.params.arguments.query;
  // Gunakan IP Gateway Docker agar bisa menembus ke Host Ubuntu
  const url = `http://172.17.0.1:8888/search?q=${encodeURIComponent(query)}&format=json`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    
    const data = await res.json();
    
    if (!data.results || data.results.length === 0) {
       return { content: [{ type: "text", text: "No results found." }] };
    }

    const results = data.results.slice(0, 5)
      .map(r => `**${r.title}**\n${r.content}\n${r.url}`)
      .join("\n\n");
      
    return { content: [{ type: "text", text: results }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Search failed: ${error.message}` }] };
  }
});

// Jalankan transport melalui STDIO
const transport = new StdioServerTransport();
await server.connect(transport);