import { createServer } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Event-driven pipeline architecture
class EventBus {
  constructor() {
    this.subscribers = new Map();
  }

  subscribe(eventName, callback) {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName).push(callback);
  }

  async emit(eventName, payload) {
    if (this.subscribers.has(eventName)) {
      for (const callback of this.subscribers.get(eventName)) {
        await callback(payload);
      }
    }
  }
}

class EndpointCatalog {
  constructor() {
    this.exactRegistry = new Map();
    this.dynamicRegistry = [];
  }

  catalogEndpoint(httpMethod, urlPattern, blueprint) {
    const signature = `${httpMethod}|||${urlPattern}`;

    if (urlPattern.includes(":")) {
      this.dynamicRegistry.push({ httpMethod, urlPattern, blueprint });
    } else {
      this.exactRegistry.set(signature, blueprint);
    }
  }

  retrieveBlueprint(httpMethod, urlPath) {
    const signature = `${httpMethod}|||${urlPath}`;

    if (this.exactRegistry.has(signature)) {
      return this.exactRegistry.get(signature);
    }

    for (const entry of this.dynamicRegistry) {
      if (
        entry.httpMethod === httpMethod &&
        this._matchesDynamicPattern(urlPath, entry.urlPattern)
      ) {
        return entry.blueprint;
      }
    }

    return null;
  }

  _matchesDynamicPattern(actualUrl, patternUrl) {
    const actualChunks = actualUrl.split("/");
    const patternChunks = patternUrl.split("/");

    if (actualChunks.length !== patternChunks.length) return false;

    return patternChunks.every((chunk, idx) => {
      return chunk.startsWith(":") || chunk === actualChunks[idx];
    });
  }

  getAllSignatures() {
    const sigs = Array.from(this.exactRegistry.keys()).map((s) =>
      s.replace("|||", " "),
    );
    this.dynamicRegistry.forEach((e) =>
      sigs.push(`${e.httpMethod} ${e.urlPattern}`),
    );
    return sigs;
  }
}

class RequestLifecycle {
  constructor(bus, catalog) {
    this.bus = bus;
    this.catalog = catalog;
    this._wireEvents();
  }

  _wireEvents() {
    this.bus.subscribe("request:received", async (ctx) => {
      await this.bus.emit("lookup:endpoint", ctx);
    });

    this.bus.subscribe("lookup:endpoint", async (ctx) => {
      ctx.endpointBlueprint = this.catalog.retrieveBlueprint(
        ctx.httpMethod,
        ctx.urlPath,
      );

      if (!ctx.endpointBlueprint) {
        ctx.httpStatus = 404;
        ctx.responseData = { error: "Endpoint not configured" };
        ctx.abortPipeline = true;
      }

      await this.bus.emit("delay:simulate", ctx);
    });

    this.bus.subscribe("delay:simulate", async (ctx) => {
      if (ctx.abortPipeline) return;

      const delayMs = ctx.endpointBlueprint.latency || 0;
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      await this.bus.emit("error:inject", ctx);
    });

    this.bus.subscribe("error:inject", async (ctx) => {
      if (ctx.abortPipeline) return;

      const blueprint = ctx.endpointBlueprint;
      if (blueprint.errorRate) {
        const randomValue = Math.random() * 100;
        if (randomValue < blueprint.errorRate) {
          ctx.httpStatus = blueprint.errorStatus || 500;
          ctx.responseData = blueprint.errorResponse || {
            error: "Simulated error",
          };
          ctx.abortPipeline = true;
          ctx.isErrorSimulation = true;
        }
      }

      await this.bus.emit("response:prepare", ctx);
    });

    this.bus.subscribe("response:prepare", async (ctx) => {
      if (ctx.abortPipeline && !ctx.isErrorSimulation) return;
      if (ctx.isErrorSimulation) return;

      const blueprint = ctx.endpointBlueprint;
      ctx.httpStatus = blueprint.status || 200;
      ctx.responseData = blueprint.response;
      ctx.customHeaders = blueprint.headers || {};
    });
  }

  async processRequest(httpMethod, urlPath) {
    const ctx = {
      httpMethod,
      urlPath,
      endpointBlueprint: null,
      httpStatus: 200,
      responseData: null,
      customHeaders: {},
      abortPipeline: false,
      isErrorSimulation: false,
    };

    await this.bus.emit("request:received", ctx);

    return ctx;
  }
}

class MockServer {
  constructor(blueprintPath) {
    this.blueprintPath = blueprintPath;
    this.catalog = new EndpointCatalog();
    this.bus = new EventBus();
    this.lifecycle = new RequestLifecycle(this.bus, this.catalog);
    this.listeningPort = 3000;

    this._loadBlueprint();
  }

  _loadBlueprint() {
    const fileContent = readFileSync(this.blueprintPath, "utf8");
    const blueprint = Bun.YAML.parse(fileContent);

    this.listeningPort = blueprint.serverPort || 3000;

    if (blueprint.endpoints && Array.isArray(blueprint.endpoints)) {
      blueprint.endpoints.forEach((ep) => {
        this.catalog.catalogEndpoint(ep.method, ep.path, ep);
      });
    }

    console.log(
      `Blueprint loaded with ${blueprint.endpoints?.length || 0} endpoints`,
    );
  }

  async _handleIncomingRequest(req, res) {
    const urlObject = new URL(req.url, `http://${req.headers.host}`);
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] ${req.method} ${urlObject.pathname}`);

    const ctx = await this.lifecycle.processRequest(
      req.method,
      urlObject.pathname,
    );

    const headers = { ...ctx.customHeaders };
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    res.writeHead(ctx.httpStatus, headers);

    const bodyContent =
      typeof ctx.responseData === "object"
        ? JSON.stringify(ctx.responseData)
        : String(ctx.responseData);

    res.end(bodyContent);

    const symbol = ctx.isErrorSimulation ? "⚠" : "→";
    console.log(`  ${symbol} ${ctx.httpStatus}`);
  }

  activate() {
    const httpServer = createServer((req, res) => {
      this._handleIncomingRequest(req, res);
    });

    httpServer.listen(this.listeningPort, () => {
      console.log("\n┌─────────────────────────────────┐");
      console.log("│   Mock API Server - Active      │");
      console.log("└─────────────────────────────────┘");
      console.log(`\nListening: http://localhost:${this.listeningPort}`);
      console.log("\nEndpoint signatures:");
      this.catalog.getAllSignatures().forEach((sig) => {
        console.log(`  → ${sig}`);
      });
      console.log("\n─────────────────────────────────\n");
    });
  }
}

const blueprintFile = process.argv[2] || join(__dirname, "config.yaml");
const mockServer = new MockServer(blueprintFile);
mockServer.activate();
