import { generateKeyPairSync, sign } from "node:crypto";

const database = new URL(process.env.MIRROR_QA_DATABASE_URL);
if (process.env.MIRROR_DOMAIN_TEST !== "true" || !/^mirror_test_[a-f0-9]{32}$/.test(database.searchParams.get("schema") ?? "")) {
  throw new Error("The Google callback fixture requires an isolated domain test");
}

const issuer = "https://accounts.google.com";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const userInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";
const fixtureEmail = /^mirror-qa-[a-f0-9-]+-student@example\.invalid$/;
let keys;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function idToken(email) {
  keys ??= generateKeyPairSync("rsa", { modulusLength: 2048 });
  const iat = Math.floor(Date.now() / 1000);
  const payload = `${encode({ alg: "RS256", kid: "mirror-google" })}.${encode({
    iss: issuer, aud: process.env.AUTH_GOOGLE_ID, sub: email, iat, exp: iat + 120,
  })}`;
  return `${payload}.${sign("RSA-SHA256", Buffer.from(payload), keys.privateKey).toString("base64url")}`;
}

const fetchNormally = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  switch (url) {
    case `${issuer}/.well-known/openid-configuration`:
      return Response.json({
        issuer, authorization_endpoint: `${issuer}/o/oauth2/v2/auth`, token_endpoint: tokenEndpoint,
        userinfo_endpoint: userInfoEndpoint, id_token_signing_alg_values_supported: ["RS256"],
      });
    case tokenEndpoint: {
      const params = new URLSearchParams(init?.body);
      const email = params.get("code") ?? "";
      if (!fixtureEmail.test(email) || !params.get("code_verifier")
        || params.get("redirect_uri") !== "http://localhost:3100/api/auth/callback/google") {
        return Response.json({ error: "invalid_grant" }, { status: 400 });
      }
      return Response.json({ access_token: Buffer.from(email).toString("base64url"), token_type: "Bearer", id_token: idToken(email) });
    }
    case userInfoEndpoint: {
      const bearer = new Headers(init?.headers).get("authorization") ?? "";
      const email = Buffer.from(bearer.replace(/^Bearer /i, ""), "base64url").toString("utf8");
      if (!fixtureEmail.test(email)) return new Response(null, { status: 401 });
      return Response.json({ sub: email, email, email_verified: true, name: "Mirror QA Student 0" });
    }
    default:
      return fetchNormally(input, init);
  }
};
