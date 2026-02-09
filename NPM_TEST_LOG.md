PS D:\User\Documents\PorfolioProjects\400\Backend> npx tsx --test --experimental-test-module-mocks src/__tests__/integration/errorHandling.test.ts
✅ Environment variables validated
▶ Error Handling Integration Tests
  ▶ Validation Errors
    ✖ should return 400 for invalid room configuration (59.4115ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)

    ✖ should accept valid room configuration (14.0428ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

    ✖ should provide detailed validation errors (11.5628ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

  ✖ Validation Errors (86.2832ms)
  ▶ Not Found Errors
    ✖ should return 404 for non-existent room (13.1491ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)

  ✖ Not Found Errors (13.8501ms)
  ▶ XSS Protection
    ✖ should sanitize script tags from request body (12.7383ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)

    ✖ should remove javascript: protocol (9.4391ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

    ✖ should sanitize nested objects (11.0453ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

  ✖ XSS Protection (34.0387ms)
  ▶ MongoDB Injection Protection
    ✖ should sanitize MongoDB operators in query (14.6805ms)
      AssertionError [ERR_ASSERTION]: Should sanitize $ne operator
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:237:20)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Test.run (node:internal/test_runner/test:932:9)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7) {
        generatedMessage: false,
        code: 'ERR_ASSERTION',
        actual: false,
        expected: true,
        operator: '=='
      }

    ✖ should sanitize dot notation attacks (14.0404ms)
      AssertionError [ERR_ASSERTION]: Should sanitize dot notation
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:248:20)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Test.run (node:internal/test_runner/test:932:9)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7) {
        generatedMessage: false,
        code: 'ERR_ASSERTION',
        actual: false,
        expected: true,
        operator: '=='
      }

  ✖ MongoDB Injection Protection (29.1607ms)
  ▶ HTTP Parameter Pollution
    ✖ should prevent duplicate parameters (13.4745ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + actual - expected

      + [
      +   '1',
      +   '2'
      + ]
      - '1'

          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:267:20)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Test.run (node:internal/test_runner/test:932:9)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7) {
        generatedMessage: true,
        code: 'ERR_ASSERTION',
        actual: [ '1', '2' ],
        expected: '1',
        operator: 'strictEqual'
      }

    ✖ should allow whitelisted duplicate parameters (7.9672ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

  ✖ HTTP Parameter Pollution (21.957ms)
  ▶ 404 Handler
    ✖ should return 404 for unknown routes (11.9422ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)

    ✖ should not affect existing routes (9.5931ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

  ✖ 404 Handler (22.4458ms)
  ▶ Error Response Format
    ✖ should include timestamp in ISO format (11.3361ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)

    ✖ should include request path (10.0243ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

    ✖ should include error code (10.5818ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

    ✖ should include error message (17.4197ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

  ✖ Error Response Format (50.1631ms)
  ▶ Unhandled Errors
    ✖ should return 500 for unknown errors (12.9407ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)

  ✖ Unhandled Errors (13.9421ms)
  ▶ Multiple Middleware Integration
    ✖ should apply all security layers (9.9507ms)
      TypeError [Error]: redisGetClientMock?.restore is not a function
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
          at TestHook.runInAsyncScope (node:async_hooks:211:14)
          at TestHook.run (node:internal/test_runner/test:931:25)
          at TestHook.run (node:internal/test_runner/test:1222:18)
          at Suite.runHook (node:internal/test_runner/test:850:20)
          at node:internal/test_runner/test:895:27
          at node:internal/util:544:20
          at Test.run (node:internal/test_runner/test:938:13)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)

  ✖ Multiple Middleware Integration (10.4845ms)
✖ Error Handling Integration Tests (293.1901ms)
ℹ tests 19
ℹ suites 10
ℹ pass 0
ℹ fail 19
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1703.6278

✖ failing tests:

test at src\__tests__\integration\errorHandling.test.ts:1:2097
✖ should return 400 for invalid room configuration (59.4115ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Promise.all (index 0)

test at src\__tests__\integration\errorHandling.test.ts:1:2519
✖ should accept valid room configuration (14.0428ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

test at src\__tests__\integration\errorHandling.test.ts:1:2728
✖ should provide detailed validation errors (11.5628ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

test at src\__tests__\integration\errorHandling.test.ts:1:3316
✖ should return 404 for non-existent room (13.1491ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Promise.all (index 0)

test at src\__tests__\integration\errorHandling.test.ts:1:3856
✖ should sanitize script tags from request body (12.7383ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Promise.all (index 0)

test at src\__tests__\integration\errorHandling.test.ts:1:4202
✖ should remove javascript: protocol (9.4391ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

test at src\__tests__\integration\errorHandling.test.ts:1:4448
✖ should sanitize nested objects (11.0453ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

test at src\__tests__\integration\errorHandling.test.ts:1:4942
✖ should sanitize MongoDB operators in query (14.6805ms)
  AssertionError [ERR_ASSERTION]: Should sanitize $ne operator
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:237:20)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Test.run (node:internal/test_runner/test:932:9)
      at async Promise.all (index 0)
      at async Suite.run (node:internal/test_runner/test:1310:7)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '=='
  }

test at src\__tests__\integration\errorHandling.test.ts:1:5206
✖ should sanitize dot notation attacks (14.0404ms)
  AssertionError [ERR_ASSERTION]: Should sanitize dot notation
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:248:20)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Test.run (node:internal/test_runner/test:932:9)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '=='
  }

test at src\__tests__\integration\errorHandling.test.ts:1:5624
✖ should prevent duplicate parameters (13.4745ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected

  + [
  +   '1',
  +   '2'
  + ]
  - '1'

      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:267:20)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Test.run (node:internal/test_runner/test:932:9)
      at async Promise.all (index 0)
      at async Suite.run (node:internal/test_runner/test:1310:7)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ '1', '2' ],
    expected: '1',
    operator: 'strictEqual'
  }

test at src\__tests__\integration\errorHandling.test.ts:1:5800
✖ should allow whitelisted duplicate parameters (7.9672ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

test at src\__tests__\integration\errorHandling.test.ts:1:6151
✖ should return 404 for unknown routes (11.9422ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Promise.all (index 0)

test at src\__tests__\integration\errorHandling.test.ts:1:6485
✖ should not affect existing routes (9.5931ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

test at src\__tests__\integration\errorHandling.test.ts:1:6740
✖ should include timestamp in ISO format (11.3361ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Promise.all (index 0)

test at src\__tests__\integration\errorHandling.test.ts:1:7031
✖ should include request path (10.0243ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

test at src\__tests__\integration\errorHandling.test.ts:1:7184
✖ should include error code (10.5818ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

test at src\__tests__\integration\errorHandling.test.ts:1:7351
✖ should include error message (17.4197ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)

test at src\__tests__\integration\errorHandling.test.ts:1:7665
✖ should return 500 for unknown errors (12.9407ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Promise.all (index 0)

test at src\__tests__\integration\errorHandling.test.ts:1:8148
✖ should apply all security layers (9.9507ms)
  TypeError [Error]: redisGetClientMock?.restore is not a function
      at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:76:29)
      at TestHook.runInAsyncScope (node:async_hooks:211:14)
      at TestHook.run (node:internal/test_runner/test:931:25)
      at TestHook.run (node:internal/test_runner/test:1222:18)
      at Suite.runHook (node:internal/test_runner/test:850:20)
      at node:internal/test_runner/test:895:27
      at node:internal/util:544:20
      at Test.run (node:internal/test_runner/test:938:13)
      at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      at async Promise.all (index 0)
PS D:\User\Documents\PorfolioProjects\400\Backend>