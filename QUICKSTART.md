# Quick Start Guide

## Installation

```bash
npm install
```

## Start the Server

```bash
npm start
```

The server will start on port 3000 by default.

## Test the Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Get users list
curl http://localhost:3000/api/users

# Get specific user
curl http://localhost:3000/api/users/1

# Create a user
curl -X POST http://localhost:3000/api/users

# Test error simulation
curl http://localhost:3000/api/products
```

## Run Tests

In a separate terminal (with server running):

```bash
npm test
```

## Custom Configuration

Create your own YAML file:

```bash
node server.js my-config.yaml
```

See `config.example.yaml` for more configuration examples.

## Configuration Features

- **Latency Simulation**: Add delays in milliseconds
- **Error Simulation**: Configure random error rates (0-100%)
- **Path Parameters**: Support for dynamic URL segments
- **Custom Status Codes**: Any HTTP status code
- **Custom Headers**: Add custom response headers
- **Error Responses**: Define specific error payloads

## Example Use Cases

1. **Test timeout handling**: Set high latency values
2. **Test error recovery**: Configure error rates
3. **Test API integrations**: Mock third-party APIs
4. **Development**: Work without backend availability
5. **Load testing**: Consistent response times
