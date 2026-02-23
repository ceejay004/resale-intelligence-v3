export const config = { runtime: "nodejs" };

let tokenCache = { token: null, exp: 0 };

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;

  const auth = Buffer.from(
    process.env.EBAY_APP_ID + ":" + process.env.EBAY_CERT_ID
  ).toString("base64");

  const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + auth
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope"
  });

  const data = await r.json();

  tokenCache.token = data.access_token;
  tokenCache.exp = Date.now() + (data.expires_in - 60) * 1000;

  return tokenCache.token;
}

export default async function handler(req, res) {

  const item = req.query.item;
  if (!item) return res.status(400).json({ error: "No item provided" });

  try {

    const token = await getToken();

    const r = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(item)}&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB"
        }
      }
    );

    const data = await r.json();

    if (!data.itemSummaries)
      return res.json({ error: "No listings found" });

    // extract prices
    const prices = data.itemSummaries
      .map(i => parseFloat(i.price?.value))
      .filter(p => !isNaN(p) && p > 3 && p < 5000);

    if (!prices.length)
      return res.json({ error: "No usable price data" });

    // remove outliers (top/bottom 20%)
    prices.sort((a,b)=>a-b);
    const trim = prices.slice(
      Math.floor(prices.length*0.2),
      Math.ceil(prices.length*0.8)
    );

    const avg = trim.reduce((a,b)=>a+b,0)/trim.length;

    res.json({
      estimated_value: avg.toFixed(2),
      samples: trim.length,
      note: "Estimated market value (very close to sold price)"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
