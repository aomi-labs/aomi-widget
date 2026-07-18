import test from "node:test";
import assert from "node:assert/strict";

import { __resetWalletStateStoreForTests } from "../.tmp-test-dist/lib/wallet-state/store.js";
import * as txRoute from "../.tmp-test-dist/app/api/operation/tx/route.js";
import * as eip712Route from "../.tmp-test-dist/app/api/operation/eip712/route.js";
import * as networkRoute from "../.tmp-test-dist/app/api/operation/network/route.js";

function getReq(url) {
  return new Request(url);
}

function jsonReq(body) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test.beforeEach(() => {
  __resetWalletStateStoreForTests();
});

test("tx route: create -> awaiting_wallet -> signed", async () => {
  const createRes = await txRoute.POST(
    jsonReq({
      session_key: "telegram:dm:1001",
      tx: { to: "0xabc", value: "0", chainId: 1 },
    }),
  );
  assert.equal(createRes.status, 200);
  const createJson = await createRes.json();
  const txId = createJson.txId;
  assert.ok(txId);

  const getPending = await txRoute.GET(
    getReq(
      `http://localhost/api/operation/tx?tx_id=${encodeURIComponent(txId)}`,
    ),
  );
  const pendingJson = await getPending.json();
  assert.equal(pendingJson.pending, true);
  assert.equal(pendingJson.status, "pending");

  const awaitingRes = await txRoute.PUT(
    jsonReq({ tx_id: txId, status: "awaiting_wallet" }),
  );
  assert.equal(awaitingRes.status, 200);

  const awaitingGet = await txRoute.GET(
    getReq(
      `http://localhost/api/operation/tx?tx_id=${encodeURIComponent(txId)}`,
    ),
  );
  const awaitingJson = await awaitingGet.json();
  assert.equal(awaitingJson.status, "awaiting_wallet");

  const signedRes = await txRoute.PUT(
    jsonReq({ tx_id: txId, status: "signed", tx_hash: "0xdeadbeef" }),
  );
  assert.equal(signedRes.status, 200);

  const signedGet = await txRoute.GET(
    getReq(
      `http://localhost/api/operation/tx?tx_id=${encodeURIComponent(txId)}`,
    ),
  );
  const signedJson = await signedGet.json();
  assert.equal(signedJson.pending, false);
  assert.equal(signedJson.status, "signed");
  assert.equal(signedJson.txHash, "0xdeadbeef");
});

test("eip712 route: create -> rejected", async () => {
  const createRes = await eip712Route.POST(
    jsonReq({
      session_key: "telegram:dm:1002",
      typed_data: { domain: { name: "A" }, message: { x: 1 } },
      description: "sign me",
    }),
  );
  assert.equal(createRes.status, 200);
  const createJson = await createRes.json();
  const eip712Id = createJson.eip712Id;
  assert.ok(eip712Id);

  const rejectRes = await eip712Route.PUT(
    jsonReq({
      eip712_id: eip712Id,
      status: "rejected",
      error_message: "User rejected",
    }),
  );
  assert.equal(rejectRes.status, 200);

  const getRes = await eip712Route.GET(
    getReq(
      `http://localhost/api/operation/eip712?eip712_id=${encodeURIComponent(eip712Id)}`,
    ),
  );
  const getJson = await getRes.json();
  assert.equal(getJson.pending, false);
  assert.equal(getJson.status, "rejected");
  assert.match(String(getJson.label), /rejected/i);
});

test("eip712 route accepts ERC-191 non_typed_data", async () => {
  const createRes = await eip712Route.POST(
    jsonReq({
      session_key: "telegram:dm:1004",
      non_typed_data: "Sign in with Ethereum",
      description: "SIWE login",
      pending_eip712_id: 9,
    }),
  );
  assert.equal(createRes.status, 200);
  const createJson = await createRes.json();
  const eip712Id = createJson.eip712Id;
  assert.ok(eip712Id);

  const getRes = await eip712Route.GET(
    getReq(
      `http://localhost/api/operation/eip712?eip712_id=${encodeURIComponent(eip712Id)}`,
    ),
  );
  const getJson = await getRes.json();
  assert.equal(getJson.pending, true);
  assert.equal(getJson.nonTypedData, "Sign in with Ethereum");
  assert.equal(getJson.typedData, undefined);
  assert.equal(getJson.pendingEip712Id, 9);
});

test("network route: create -> switched and session_key lookup resolves active op", async () => {
  const createRes = await networkRoute.POST(
    jsonReq({
      session_key: "telegram:dm:1003",
      chain_id: 8453,
    }),
  );
  assert.equal(createRes.status, 200);
  const createJson = await createRes.json();
  const switchId = createJson.switchId;
  assert.ok(switchId);

  const bySession = await networkRoute.GET(
    getReq(
      "http://localhost/api/operation/network?session_key=telegram%3Adm%3A1003",
    ),
  );
  const bySessionJson = await bySession.json();
  assert.equal(bySessionJson.pending, true);
  assert.equal(bySessionJson.switchId, switchId);

  const switchedRes = await networkRoute.PUT(
    jsonReq({
      switch_id: switchId,
      status: "switched",
      chain_id: 8453,
      address: "0x123",
    }),
  );
  assert.equal(switchedRes.status, 200);

  const getSwitched = await networkRoute.GET(
    getReq(
      `http://localhost/api/operation/network?switch_id=${encodeURIComponent(switchId)}`,
    ),
  );
  const switchedJson = await getSwitched.json();
  assert.equal(switchedJson.pending, false);
  assert.equal(switchedJson.status, "switched");
  assert.equal(switchedJson.chainId, 8453);
});
