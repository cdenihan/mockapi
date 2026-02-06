# mockapi

A configurable mock server for API development and testing. Define responses in YAML, simulate latency and errors.

> **⚠️ AI-Generated Code**: This project was entirely written using GitHub Copilot AI assistance. The codebase was generated through AI-powered development.

## Features

- **YAML Configuration**: Define API endpoints and responses in simple YAML files
- **Latency Simulation**: Add realistic delays to responses for testing timeout scenarios
- **Error Simulation**: Configure random error rates to test error handling
- **Dynamic Path Parameters**: Support for path parameters like `/api/users/:id`
- **Custom Status Codes**: Return any HTTP status code for your endpoints
- **Custom Headers**: Configure response headers for each endpoint
- **Zero Dependencies**: Uses only Bun's built-in modules (including `Bun.YAML.parse()` for config parsing)
- **Bun Runtime**: Optimized for Bun with fast startup and execution

## Installation

No installation required! This project has zero dependencies.

If you don't have Bun installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Usage

### Start the server with default configuration

```bash
bun run server.js
```

Or use the npm script:

```bash
bun start
```

### Start with a custom configuration file

```bash
bun run server.js path/to/your/config.yaml
```

## Configuration Format

Create a `config.yaml` file with the following structure:

```yaml
serverPort: 3000

endpoints:
  - path: /api/users
    method: GET
    status: 200
    latency: 100           # Delay in milliseconds
    response:
      users:
        - id: 1
          name: Alice Johnson
        - id: 2
          name: Bob Smith

  - path: /api/products
    method: GET
    status: 200
    latency: 150
    errorRate: 10          # 10% chance of error
    errorStatus: 503
    errorResponse:
      error: Service unavailable
    response:
      products:
        - id: 101
          name: Laptop
```

### Configuration Options

- `serverPort`: Port number for the server (default: 3000)
- `endpoints`: Array of endpoint definitions

#### Endpoint Options

- `path`: URL path (supports parameters like `/api/users/:id`)
- `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
- `status`: HTTP status code for successful responses (default: 200)
- `latency`: Response delay in milliseconds (optional)
- `response`: Response payload (can be JSON object or string)
- `headers`: Custom response headers (optional)
- `errorRate`: Percentage chance (0-100) of returning an error (optional)
- `errorStatus`: HTTP status code for error responses (optional)
- `errorResponse`: Response payload when error is triggered (optional)

## Testing

Run the test suite:

```bash
bun test
```

Or:

```bash
bun run test.js
```

Note: The server must be running before executing tests.

## Example Scenarios

### Testing Timeouts

Configure endpoints with high latency values to test timeout handling:

```yaml
- path: /api/slow-endpoint
  method: GET
  latency: 5000
  response:
    message: Delayed response
```

### Testing Error Handling

Use error rates to randomly trigger failures:

```yaml
- path: /api/unreliable
  method: GET
  errorRate: 50
  errorStatus: 500
  errorResponse:
    error: Random failure
  response:
    message: Success
```

### Testing Different Status Codes

```yaml
- path: /api/created
  method: POST
  status: 201
  response:
    id: 123
    message: Resource created
```

## License

MIT License - See LICENSE file for details.

This project was created entirely with AI assistance using GitHub Copilot.
