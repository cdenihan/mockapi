const httpModule = require('http');
const urlParser = require('url');
const fileSystem = require('fs');
const pathUtil = require('path');
const yamlProcessor = require('js-yaml');

class MockAPIEngine {
  constructor(configFilePath) {
    this.configFilePath = configFilePath;
    this.routeDefinitions = new Map();
    this.serverPort = 3000;
    this.loadConfigurationData();
  }

  loadConfigurationData() {
    try {
      const yamlContent = fileSystem.readFileSync(this.configFilePath, 'utf8');
      const parsedConfig = yamlProcessor.load(yamlContent);
      
      this.serverPort = parsedConfig.serverPort || 3000;
      
      if (parsedConfig.endpoints && Array.isArray(parsedConfig.endpoints)) {
        parsedConfig.endpoints.forEach(endpointSpec => {
          const routeKey = `${endpointSpec.method}:${endpointSpec.path}`;
          this.routeDefinitions.set(routeKey, endpointSpec);
        });
      }
      
      console.log(`Configuration loaded: ${this.routeDefinitions.size} endpoints registered`);
    } catch (loadError) {
      console.error('Configuration loading failed:', loadError.message);
      process.exit(1);
    }
  }

  findMatchingRoute(httpMethod, requestPath) {
    const exactMatchKey = `${httpMethod}:${requestPath}`;
    if (this.routeDefinitions.has(exactMatchKey)) {
      return this.routeDefinitions.get(exactMatchKey);
    }
    
    for (const [routeKey, routeSpec] of this.routeDefinitions.entries()) {
      const colonIndex = routeKey.indexOf(':');
      const method = routeKey.substring(0, colonIndex);
      const pathPattern = routeKey.substring(colonIndex + 1);
      if (method === httpMethod && this.pathMatchesPattern(requestPath, pathPattern)) {
        return routeSpec;
      }
    }
    
    return null;
  }

  pathMatchesPattern(actualPath, patternPath) {
    if (actualPath === patternPath) return true;
    
    const patternSegments = patternPath.split('/');
    const actualSegments = actualPath.split('/');
    
    if (patternSegments.length !== actualSegments.length) return false;
    
    for (let idx = 0; idx < patternSegments.length; idx++) {
      const patternPart = patternSegments[idx];
      const actualPart = actualSegments[idx];
      
      if (patternPart.startsWith(':')) {
        continue;
      }
      
      if (patternPart !== actualPart) {
        return false;
      }
    }
    
    return true;
  }

  async simulateLatency(delayMs) {
    if (delayMs && delayMs > 0) {
      return new Promise(resolver => setTimeout(resolver, delayMs));
    }
  }

  handleIncomingRequest(req, res) {
    const parsedUrl = urlParser.parse(req.url, true);
    const requestPath = parsedUrl.pathname;
    const httpMethod = req.method;

    console.log(`[${new Date().toISOString()}] ${httpMethod} ${requestPath}`);

    const matchedRoute = this.findMatchingRoute(httpMethod, requestPath);

    if (!matchedRoute) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not configured' }));
      return;
    }

    this.simulateLatency(matchedRoute.latency).then(() => {
      const shouldSimulateError = matchedRoute.errorRate && 
                                  Math.random() < (matchedRoute.errorRate / 100);

      if (shouldSimulateError) {
        const errorStatusCode = matchedRoute.errorStatus || 500;
        const errorPayload = matchedRoute.errorResponse || { error: 'Simulated error' };
        res.writeHead(errorStatusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorPayload));
        console.log(`  → Simulated error: ${errorStatusCode}`);
        return;
      }

      const statusCode = matchedRoute.status || 200;
      const responseHeaders = matchedRoute.headers || {};
      responseHeaders['Content-Type'] = responseHeaders['Content-Type'] || 'application/json';

      res.writeHead(statusCode, responseHeaders);
      
      const responsePayload = typeof matchedRoute.response === 'object' 
        ? JSON.stringify(matchedRoute.response)
        : matchedRoute.response;
      
      res.end(responsePayload);
      console.log(`  → Response: ${statusCode}`);
    });
  }

  startServer() {
    const httpServer = httpModule.createServer((req, res) => {
      this.handleIncomingRequest(req, res);
    });

    httpServer.listen(this.serverPort, () => {
      console.log(`Mock API Server running on port ${this.serverPort}`);
      console.log(`Configured endpoints:`);
      this.routeDefinitions.forEach((spec, key) => {
        console.log(`  ${key}`);
      });
    });
  }
}

const configPath = process.argv[2] || pathUtil.join(__dirname, 'config.yaml');
const apiEngine = new MockAPIEngine(configPath);
apiEngine.startServer();
