const httpClient = require('http');

class MockAPITester {
  constructor(baseUrl, port) {
    this.baseUrl = baseUrl;
    this.port = port;
    this.testResults = [];
  }

  makeRequest(method, path) {
    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: this.baseUrl,
        port: this.port,
        path: path,
        method: method
      };

      const request = httpClient.request(requestOptions, (response) => {
        let dataBuffer = '';

        response.on('data', chunk => {
          dataBuffer += chunk;
        });

        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: dataBuffer
          });
        });
      });

      request.on('error', reject);
      request.end();
    });
  }

  async executeTest(testName, testFunction) {
    try {
      await testFunction();
      this.testResults.push({ name: testName, passed: true });
      console.log(`✓ ${testName}`);
    } catch (errorObj) {
      this.testResults.push({ name: testName, passed: false, error: errorObj.message });
      console.log(`✗ ${testName}: ${errorObj.message}`);
    }
  }

  async runAllTests() {
    console.log('Starting Mock API Tests...\n');

    await this.executeTest('GET /api/users returns 200', async () => {
      const result = await this.makeRequest('GET', '/api/users');
      if (result.statusCode !== 200) {
        throw new Error(`Expected 200, got ${result.statusCode}`);
      }
      const parsedData = JSON.parse(result.body);
      if (!parsedData.users || parsedData.users.length !== 2) {
        throw new Error('Expected 2 users in response');
      }
    });

    await this.executeTest('GET /api/health returns healthy status', async () => {
      const result = await this.makeRequest('GET', '/api/health');
      if (result.statusCode !== 200) {
        throw new Error(`Expected 200, got ${result.statusCode}`);
      }
      const parsedData = JSON.parse(result.body);
      if (parsedData.status !== 'healthy') {
        throw new Error('Expected healthy status');
      }
    });

    await this.executeTest('POST /api/users returns 201', async () => {
      const result = await this.makeRequest('POST', '/api/users');
      if (result.statusCode !== 201) {
        throw new Error(`Expected 201, got ${result.statusCode}`);
      }
    });

    await this.executeTest('GET /api/users/1 returns user data', async () => {
      const result = await this.makeRequest('GET', '/api/users/1');
      if (result.statusCode !== 200) {
        throw new Error(`Expected 200, got ${result.statusCode}`);
      }
      const parsedData = JSON.parse(result.body);
      if (!parsedData.name) {
        throw new Error('Expected user name in response');
      }
    });

    await this.executeTest('GET /api/products returns products', async () => {
      const result = await this.makeRequest('GET', '/api/products');
      if (result.statusCode !== 200 && result.statusCode !== 503) {
        throw new Error(`Expected 200 or 503 (error simulation), got ${result.statusCode}`);
      }
    });

    await this.executeTest('Unknown endpoint returns 404', async () => {
      const result = await this.makeRequest('GET', '/api/nonexistent');
      if (result.statusCode !== 404) {
        throw new Error(`Expected 404, got ${result.statusCode}`);
      }
    });

    console.log('\n--- Test Summary ---');
    const passedCount = this.testResults.filter(t => t.passed).length;
    const totalCount = this.testResults.length;
    console.log(`Passed: ${passedCount}/${totalCount}`);
    
    if (passedCount !== totalCount) {
      process.exit(1);
    }
  }
}

setTimeout(() => {
  const tester = new MockAPITester('localhost', 3000);
  tester.runAllTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}, 1000);
