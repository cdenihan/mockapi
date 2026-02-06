import { request } from "http";

class TestHarness {
  constructor(targetHost, targetPort) {
    this.targetHost = targetHost;
    this.targetPort = targetPort;
    this.testOutcomes = [];
  }

  async transmitRequest(httpVerb, resourcePath) {
    return new Promise((resolvePromise, rejectPromise) => {
      const httpReq = request(
        {
          hostname: this.targetHost,
          port: this.targetPort,
          path: resourcePath,
          method: httpVerb,
        },
        (httpResp) => {
          let accumulatedData = "";
          httpResp.on("data", (fragment) => {
            accumulatedData += fragment;
          });
          httpResp.on("end", () => {
            resolvePromise({
              statusCode: httpResp.statusCode,
              headerData: httpResp.headers,
              bodyText: accumulatedData,
            });
          });
        },
      );

      httpReq.on("error", rejectPromise);
      httpReq.end();
    });
  }

  async verifyBehavior(testDescription, verificationFunc) {
    try {
      await verificationFunc();
      this.testOutcomes.push({ description: testDescription, passed: true });
      console.log(`✓ ${testDescription}`);
    } catch (errorInstance) {
      this.testOutcomes.push({
        description: testDescription,
        passed: false,
        failureReason: errorInstance.message,
      });
      console.log(`✗ ${testDescription}: ${errorInstance.message}`);
    }
  }

  async runTestSuite() {
    console.log("┌─────────────────────────────────┐");
    console.log("│      Test Suite Running         │");
    console.log("└─────────────────────────────────┘\n");

    await this.verifyBehavior(
      "GET /api/users should return 200 with user array",
      async () => {
        const httpResponse = await this.transmitRequest("GET", "/api/users");
        if (httpResponse.statusCode !== 200) {
          throw new Error(
            `Status mismatch: expected 200, got ${httpResponse.statusCode}`,
          );
        }
        const parsedData = JSON.parse(httpResponse.bodyText);
        if (!parsedData.users || parsedData.users.length !== 2) {
          throw new Error("User array validation failed");
        }
      },
    );

    await this.verifyBehavior(
      "GET /api/health should confirm healthy status",
      async () => {
        const httpResponse = await this.transmitRequest("GET", "/api/health");
        if (httpResponse.statusCode !== 200) {
          throw new Error(
            `Status mismatch: expected 200, got ${httpResponse.statusCode}`,
          );
        }
        const parsedData = JSON.parse(httpResponse.bodyText);
        if (parsedData.status !== "healthy") {
          throw new Error("Health status validation failed");
        }
      },
    );

    await this.verifyBehavior(
      "POST /api/users should return 201 created",
      async () => {
        const httpResponse = await this.transmitRequest("POST", "/api/users");
        if (httpResponse.statusCode !== 201) {
          throw new Error(
            `Status mismatch: expected 201, got ${httpResponse.statusCode}`,
          );
        }
      },
    );

    await this.verifyBehavior(
      "GET /api/users/1 should return specific user data",
      async () => {
        const httpResponse = await this.transmitRequest("GET", "/api/users/1");
        if (httpResponse.statusCode !== 200) {
          throw new Error(
            `Status mismatch: expected 200, got ${httpResponse.statusCode}`,
          );
        }
        const parsedData = JSON.parse(httpResponse.bodyText);
        if (!parsedData.name) {
          throw new Error("User name field missing");
        }
      },
    );

    await this.verifyBehavior(
      "GET /api/products should handle variable responses",
      async () => {
        const httpResponse = await this.transmitRequest("GET", "/api/products");
        if (
          httpResponse.statusCode !== 200 &&
          httpResponse.statusCode !== 503
        ) {
          throw new Error(
            `Status mismatch: expected 200 or 503, got ${httpResponse.statusCode}`,
          );
        }
      },
    );

    await this.verifyBehavior("Undefined routes should yield 404", async () => {
      const httpResponse = await this.transmitRequest(
        "GET",
        "/api/nonexistent",
      );
      if (httpResponse.statusCode !== 404) {
        throw new Error(
          `Status mismatch: expected 404, got ${httpResponse.statusCode}`,
        );
      }
    });

    console.log("\n┌─────────────────────────────────┐");
    console.log("│       Test Results              │");
    console.log("└─────────────────────────────────┘");

    const passedCount = this.testOutcomes.filter(
      (outcome) => outcome.passed,
    ).length;
    const totalCount = this.testOutcomes.length;

    console.log(`\nPassed: ${passedCount}/${totalCount}\n`);

    if (passedCount !== totalCount) {
      console.log("Failed test cases:");
      this.testOutcomes
        .filter((o) => !o.passed)
        .forEach((outcome) => {
          console.log(`  ✗ ${outcome.description}`);
          console.log(`    Reason: ${outcome.failureReason}`);
        });
      process.exit(1);
    } else {
      console.log("All test cases passed successfully! ✓\n");
    }
  }
}

setTimeout(() => {
  const testHarness = new TestHarness("localhost", 3000);
  testHarness.runTestSuite().catch((errorInstance) => {
    console.error("Test suite execution failed:", errorInstance);
    process.exit(1);
  });
}, 1000);
