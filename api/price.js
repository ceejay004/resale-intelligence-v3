export const config = { runtime: "nodejs" };

async function getToken() {
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
  return data.access_token;
}

export default async function handler(req, res) {
  const item = req.query.item;
  if (!item) return res.status(400).json({ error: "No item provided" });

  try {

    const token = await getToken();

    const r = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(item)}&limit=50&sort=-price`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB"
        }
      }
    );

    const data = await r.json();

    if (!data.itemSummaries)
      return res.json({ error: "No results" });

    // take only items with a price
    const prices = data.itemSummaries
      .map(i => i.price?.value)
      .filter(v => v !== undefined)
      .map(Number)
      .filter(p => p > 3 && p < 5000);

    if (prices.length === 0)
      return res.json({ error: "No price data" });

    // remove top & bottom outliers
    prices.sort((a,b)=>a-b);
    const trimmed = prices.slice(2, prices.length-2);

    const avg = trimmed.reduce((a,b)=>a+b,0)/trimmed.length;

    res.json({
      average: avg.toFixed(2),
      samples: trimmed.length
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
