import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/feedback/route.ts";

const request = (body) => new Request("http://localhost/api/feedback", {
  method: "POST", headers: { "Content-Type": "application/json" }, body,
});

for (const body of ["null", "[]", '"hello"', "42", "true"]) {
  test(`rejects non-object payload ${body} with a controlled 400`, async () => {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error: "invalid_payload" });
  });
}

test("malformed JSON returns 400", async () => {
  const response = await POST(request("{"));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_json");
});

test("invalid email is rejected before delivery", async () => {
  const response = await POST(request(JSON.stringify({ message: "Hallo", email: "invalid" })));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_email");
});

test("honeypot returns success without delivering a message", async () => {
  const response = await POST(request(JSON.stringify({ website: "spam.example" })));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});
