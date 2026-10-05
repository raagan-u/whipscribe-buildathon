import assert from "node:assert/strict";
import { request } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { createViewerServer } from "../src/server.ts";

async function startServer(options: { maxWavBytes?: number } = {}) {
  const server = createViewerServer(undefined, options);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return { server, root: `http://127.0.0.1:${address.port}` };
}

test("reports a deployment health check without exposing configuration", async t => {
  const { server, root } = await startServer();
  t.after(() => server.close());
  const response = await fetch(root + "/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", version: "dev" });
});

test("serves the merged transcript download module", async t => {
  const { server, root } = await startServer();
  t.after(() => server.close());
  const response = await fetch(root + "/transcript-download.js");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/javascript/);
  assert.match(await response.text(), /buildMergedTranscript/);
});

test("rejects WAVs over the configured upload limit", async t => {
  const { server, root } = await startServer({ maxWavBytes: 8 });
  t.after(() => server.close());
  const response = await fetch(root + "/api/notes", {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: Buffer.alloc(9),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /exceeds the 0 MiB lesson limit/);
});

test("rejects a second analysis while one upload is still open", async t => {
  const { server, root } = await startServer();
  t.after(() => server.close());
  const held = request(root + "/api/notes", { method: "POST", headers: { "Content-Type": "audio/wav" } });
  held.on("error", () => {});
  const socketReady = once(held, "socket");
  held.write(Buffer.from([0]));
  await socketReady;
  await new Promise(resolve => setTimeout(resolve, 20));

  const response = await fetch(root + "/api/notes", {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: Buffer.alloc(1),
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "5");
  assert.equal((await response.json()).code, "ANALYSIS_BUSY");
  held.destroy();
});
