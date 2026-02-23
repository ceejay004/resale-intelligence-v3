export const config = { runtime: "nodejs18.x" };

export default async function handler(req, res) {
  try {

    const auth = Buffer.from(process.env.EBAY_APP_ID + ":").toString("base64");

    const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + auth
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope"
    });

    const data = await r.json();

    if (data.access_token) {
      res.json({ success: true });
    } else {
      res.json({ error: data });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
