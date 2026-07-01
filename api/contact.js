// AGON | COMBAT SPORTS — Contact form relay
// Forwards site contact-form submissions to the owner via the existing
// @Agon_combatbot Telegram bot. No third-party email service, no new
// credentials — reuses BOT_TOKEN/ADMIN_ID already used by agon-fighter.
//
// Required Vercel env vars (Project Settings -> Environment Variables):
//   BOT_TOKEN, ADMIN_ID
//
// (c) 2026 CHEVORA OU. All rights reserved. Powered by S.Cepinoga.

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    res.status(400).json({ ok: false, error: "missing_fields" });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }
  if (name.length > 120 || email.length > 200 || message.length > 2000) {
    res.status(400).json({ ok: false, error: "field_too_long" });
    return;
  }

  const token = process.env.BOT_TOKEN;
  const adminId = process.env.ADMIN_ID;
  if (!token || !adminId) {
    res.status(500).json({ ok: false, error: "server_not_configured" });
    return;
  }

  // Plain-text sendMessage (no parse_mode) - no HTML/Markdown injection risk,
  // form values are sent through as-is.
  const text = [
    "New message from agoncombat.com",
    "",
    "Name: " + String(name).trim(),
    "Email: " + String(email).trim(),
    "",
    String(message).trim(),
  ].join("\n");

  try {
    const tgResp = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: adminId, text: text }),
    });
    const tgData = await tgResp.json();
    if (!tgData.ok) {
      res.status(502).json({ ok: false, error: "telegram_send_failed" });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(502).json({ ok: false, error: "telegram_unreachable" });
  }
};
