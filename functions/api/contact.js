async function getZohoAccessToken(env) {
  const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";

  const body = new URLSearchParams({
    refresh_token: env.ZOHO_REFRESH_TOKEN,
    client_id: env.ZOHO_CLIENT_ID,
    client_secret: env.ZOHO_CLIENT_SECRET,
    grant_type: "refresh_token",
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Zoho token refresh failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();

  if (!data.access_token) {
    throw new Error("Zoho token refresh returned no access_token.");
  }

  return data.access_token;
}

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

  const finalSubject = `Monte Sano Press: ${subject || "General inquiry"}`;
  const finalBody = `
New Monte Sano Press contact form submission

Name: ${name}
Email: ${email}
Subject: ${subject || "General inquiry"}

Message:
${message}
`.trim();

  try {
    const accessToken = await getZohoAccessToken(env);

    const sendUrl = `https://mail.zoho.com/api/accounts/${env.ZOHO_ACCOUNT_ID}/messages`;

    const payload = {
      fromAddress: env.CONTACT_FROM_EMAIL,
      toAddress: env.CONTACT_TO_EMAIL,
      subject: finalSubject,
      content: finalBody,
      mailFormat: "plaintext",
      replyTo: email,
    };

    const sendResp = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!sendResp.ok) {
      const text = await sendResp.text();
      throw new Error(`Zoho send failed: ${sendResp.status} ${text}`);
    }

    return Response.redirect("https://www.montesano-press.com/?contact=success", 302);
  } catch (err) {
  console.error("CONTACT FORM ERROR:", err);
  return new Response(
    `Contact form failed:\n${err?.message || err}`,
    { status: 500, headers: { "Content-Type": "text/plain" } }
  );
}
}
