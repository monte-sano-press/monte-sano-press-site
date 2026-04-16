export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();

  const token = formData.get("cf-turnstile-response");
  if (!token) {
    return Response.redirect("https://www.montesano-press.com/?contact=failed", 302);
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
    return Response.redirect("https://www.montesano-press.com/?contact=failed", 302);
  }

  const name = (formData.get("name") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim();
  const subject = (formData.get("subject") || "").toString().trim();
  const message = (formData.get("message") || "").toString().trim();

  if (!name || !email || !message) {
    return Response.redirect("https://www.montesano-press.com/?contact=failed", 302);
  }

  return Response.redirect("https://www.montesano-press.com/?contact=success", 302);
}
