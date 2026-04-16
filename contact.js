export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();

  const token = formData.get("cf-turnstile-response");
  if (!token) {
    return new Response("Missing Turnstile token.", { status: 400 });
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
    return new Response("Turnstile verification failed.", { status: 403 });
  }

  const name = (formData.get("name") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim();
  const subject = (formData.get("subject") || "Monte Sano contact form").toString().trim();
  const message = (formData.get("message") || "").toString().trim();

  if (!name || !email || !message) {
    return new Response("Missing required fields.", { status: 400 });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      note: "Turnstile passed. Delivery to inbox still needs to be wired up.",
      submission: { name, email, subject, message }
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}