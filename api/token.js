export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {

    // Create Base64 auth string using App ID + Cert ID
    const auth = Buffer.from(
      process.env.EBAY_APP_ID + ":" + process.env.EBAY_CERT_ID
    ).toString("base64");

    // Request OAuth token from eBay
    const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + auth
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope"
    });

    const data = await r.json();

    // Return useful debug info
    if (data.access_token) {
      res.status(200).json({
        success: true,
        expires_in: data.expires_in
      });
    } else {
      res.status(400).json({
        success: false,
        error: data
      });
    }

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
}
