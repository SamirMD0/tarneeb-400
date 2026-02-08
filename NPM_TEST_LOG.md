PS D:\User\Documents\PorfolioProjects\400\Backend> npm run test

> backend@1.0.0 test
> tsx --test

✅ Environment variables validated
▶ Error Handling Integration Tests
  ▶ Validation Errors
    ✖ should return 400 for invalid room configuration (105.5273ms)
      Error: expected 400 "Bad Request", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:72:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async startSubtestAfterBootstrap (node:internal/test_runner/harness:296:3)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should accept valid room configuration (17.8855ms)
      Error: expected 201 "Created", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:89:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should provide detailed validation errors (15.5063ms)
      Error: expected 400 "Bad Request", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:103:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

  ✖ Validation Errors (141.2757ms)
  ▶ Not Found Errors
    ✖ should return 404 for non-existent room (25.701ms)
      Error: expected 404 "Not Found", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:126:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

  ✖ Not Found Errors (26.6782ms)
  ▶ XSS Protection
    ✖ should sanitize script tags from request body (15.0551ms)
      Error: expected 200 "OK", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:153:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should remove javascript: protocol (10.997ms)
      Error: expected 200 "OK", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:165:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should sanitize nested objects (20.1203ms)
      Error: expected 200 "OK", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:179:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

  ✖ XSS Protection (47.6901ms)
  ▶ MongoDB Injection Protection
    ✖ should sanitize MongoDB operators in query (14.6133ms)
      Error: expected 200 "OK", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:199:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should sanitize dot notation attacks (15.7468ms)
      Error: expected 200 "OK", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:210:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

  ✖ MongoDB Injection Protection (31.2573ms)
  ▶ HTTP Parameter Pollution
    ✖ should prevent duplicate parameters (15.57ms)
      Error: expected 200 "OK", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:230:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should allow whitelisted duplicate parameters (14.5811ms)
      Error: expected 200 "OK", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:239:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

  ✖ HTTP Parameter Pollution (30.8451ms)
  ▶ 404 Handler
    ✖ should return 404 for unknown routes (13.4524ms)
      Error: expected 404 "Not Found", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:258:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should not affect existing routes (10.7769ms)
      Error: expected 200 "OK", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:269:49)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

  ✖ 404 Handler (24.9029ms)
  ▶ Error Response Format
    ✖ should include timestamp in ISO format (14.5498ms)
      Error: expected 400 "Bad Request", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:283:63)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should include request path (9.4106ms)
      Error: expected 400 "Bad Request", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:293:63)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should include error code (28.034ms)
      Error: expected 400 "Bad Request", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:299:63)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

    ✖ should include error message (10.0363ms)
      Error: expected 400 "Bad Request", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:305:63)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

  ✖ Error Response Format (62.9468ms)
  ▶ Unhandled Errors
    ✖ should return 500 for unknown errors (11.8097ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + actual - expected

      + 'Cannot set property query of #<IncomingMessage> which has only a getter'
      - 'Unexpected error'

          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:325:20)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Test.run (node:internal/test_runner/test:932:9)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7) {
        generatedMessage: true,
        code: 'ERR_ASSERTION',
        actual: 'Cannot set property query of #<IncomingMessage> which has only a getter',
        expected: 'Unexpected error',
        operator: 'strictEqual'
      }

  ✖ Unhandled Errors (12.5164ms)
  ▶ Multiple Middleware Integration
    ✖ should apply all security layers (21.5632ms)
      Error: expected 400 "Bad Request", got 500 "Internal Server Error"
          at TestContext.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\src\__tests__\integration\errorHandling.test.ts:351:18)
          at Test.runInAsyncScope (node:async_hooks:211:14)
          at Test.run (node:internal/test_runner/test:931:25)
          at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
          at async Promise.all (index 0)
          at async Suite.run (node:internal/test_runner/test:1310:7)
          at async Suite.processPendingSubtests (node:internal/test_runner/test:629:7)
      ----
          at Test._assertStatus (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:309:14)
          at D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:365:13
          at Test._assertFunction (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:342:13)
          at Test.assert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:195:23)
          at localAssert (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:138:14)
          at Server.<anonymous> (D:\User\Documents\PorfolioProjects\400\Backend\node_modules\supertest\lib\test.js:152:11)
          at Object.onceWrapper (node:events:638:28)
          at Server.emit (node:events:524:28)
          at emitCloseNT (node:net:2416:8)
          at process.processTicksAndRejections (node:internal/process/task_queues:89:21)

  ✖ Multiple Middleware Integration (22.1402ms)
✖ Error Handling Integration Tests (410.1355ms)
✅ Environment variables validated
▶ Error Tracking Integration Tests
  ▶ Error Metrics Tracking
    ✔ should track validation errors in metrics (89.1796ms)
    ✔ should track not found errors in metrics (16.8675ms)
    ✔ should track internal errors in metrics (15.5292ms)
    ✔ should track rate limit errors in metrics (15.0741ms)
    ✔ should distinguish between operational and internal errors (22.0282ms)
  ✔ Error Metrics Tracking (161.112ms)
  ▶ Error Counter Increment
    ✔ should increment error counter for each error (44.5734ms)
    ✔ should track different error types separately (45.4552ms)
  ✔ Error Counter Increment (91.1152ms)
  ▶ Error Response Format
    ✔ should include error code in metrics (15.6061ms)
    ✔ should include severity in metrics (11.4307ms)
  ✔ Error Response Format (27.6092ms)
  ▶ Metrics Reset
    ✔ should reset error counters when metrics are reset (30.6466ms)
  ✔ Metrics Reset (30.9698ms)
  ▶ Edge Cases
    ✔ should handle unknown error types (12.4607ms)
  ✔ Edge Cases (12.7724ms)
✔ Error Tracking Integration Tests (332.262ms)
▶ Monitoring Integration
  ✔ should expose /metrics endpoint (59.3244ms)
2026-02-08 20:28:44.102 [warn]: Health check degraded {"service":"tarneeb-backend","mongodb":false,"redis":false}
  ✔ should expose /api/health endpoint (26.7586ms)
  ✔ should track errors in metrics (24.8258ms)
✔ Monitoring Integration (118.4378ms)
2026-02-08 20:28:45.201 [info]: [Socket] Event handlers registered {"service":"tarneeb-backend"}
2026-02-08 20:28:45.289 [info]: Socket connected {"service":"tarneeb-backend","socketId":"nrzMutpnAW_UmW0eAAAB","ip":"::1"}
