async function getZohoAccessToken(env) {
  const resp = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: env.ZOHO_REFRESH_TOKEN,
      client_id: env.ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token refresh failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();

  if (!data.access_token) {
    throw new Error("Token refresh returned no access token");
  }

  return data.access_token;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();

  const token = formData.get("cf-turnstile-response");
  const ip = request.headers.get("CF-Connecting-IP") || "";

  const verifyForm = new FormData();
  verifyForm.append("secret", env.TURNSTILE_SECRET_KEY);
  verifyForm.append("response", token);
  verifyForm.append("remoteip", ip);

  const verifyResp = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: verifyForm }
  );

  const verifyData = await verifyResp.json();

  if (!verifyData.success) {
    return Response.redirect("https://www.montesano-press.com/?contact=failed", 302);
  }

  const name = (formData.get("name") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim();
  const subject = (formData.get("subject") || "").toString().trim();
  const message = (formData.get("message") || "").toString().trim();

  try {
    const accessToken = await getZohoAccessToken(env);

    const sendResp = await fetch(
      `https://mail.zoho.com/api/accounts/${env.ZOHO_ACCOUNT_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAddress: env.CONTACT_FROM_EMAIL,
          toAddress: env.CONTACT_TO_EMAIL,
          subject: `Monte Sano Press: ${subject || "General inquiry"}`,
          content:
`New Monte Sano Press contact form submission

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}`,
          mailFormat: "plaintext",
          replyTo: email,
        }),
      }
    );

    const text = await sendResp.text();

    if (!sendResp.ok) {
      throw new Error(`Zoho send failed: ${sendResp.status} ${text}`);
    }

    return Response.redirect("https://www.montesano-press.com/?contact=success", 302);
  } catch (err) {
    console.error("CONTACT FORM ERROR:", err);
    return new Response(`FAILED: ${err?.message || err}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}
