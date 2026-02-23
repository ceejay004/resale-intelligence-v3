export const config = { runtime: "nodejs" };

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString("base64");

  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope"
  });

  const data = await response.json();

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

export default async function handler(req, res) {
  try {
    const item = req.query.item;
    if (!item) return res.status(400).json({ error: "No item provided" });

    const token = await getToken();

    const r = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(item)}&limit=40`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB"
        }
      }
    );

    const data = await r.json();

    if (!data.itemSummaries)
      return res.json({ error: "No listings returned from eBay" });

    const prices = data.itemSummaries
      .map(i => parseFloat(i.price?.value))
      .filter(p => !isNaN(p) && p > 3 && p < 5000);

    if (!prices.length)
      return res.json({ error: "No usable price data" });

    prices.sort((a,b)=>a-b);

    const trimmed = prices.slice(
      Math.floor(prices.length * 0.2),
      Math.ceil(prices.length * 0.8)
    );

    const avg = trimmed.reduce((a,b)=>a+b,0)/trimmed.length;

    return res.json({
      estimated_value: avg.toFixed(2),
      based_on: trimmed.length
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
