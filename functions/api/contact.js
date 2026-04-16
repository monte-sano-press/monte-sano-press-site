export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();

  const token = formData.get("cf-turnstile-response");
  if (!token) {
    return new Response("FAILED: missing Turnstile token", {
      status: 400,
      headers: { "Content-Type": "text/plain" }
    });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "";

  const verifyForm = new FormData();
  verifyForm.append("secret", env.TURNSTILE_SECRET_KEY);
  verifyForm.append("response", token);
  verifyForm.append("remoteip", ip);

  const verifyResponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: verifyForm,
    }
  );

  const verifyData = await verifyResponse.json();

  if (!verifyData.success) {
    return new Response(`FAILED: Turnstile check failed\n${JSON.stringify(verifyData)}`, {
      status: 403,
      headers: { "Content-Type": "text/plain" }
    });
  }

  return new Response("PASSED: Turnstile verified", {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}
