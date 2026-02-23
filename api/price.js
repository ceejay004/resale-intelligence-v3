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
  if (!item) return res.status(400).json({ error: "No item" });

  try {

    const token = await getToken();

    const search = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(item)}&filter=soldItems:true&limit=20`,
      {
        headers: {
          Authorization: "Bearer " + token,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB"
        }
      }
    );

    const data = await search.json();

    if (!data.itemSummaries || data.itemSummaries.length === 0) {
      return res.json({ error: "No sold listings found" });
    }

    const prices = data.itemSummaries
      .map(i => parseFloat(i.price.value))
      .filter(p => !isNaN(p));

    const avg = prices.reduce((a,b)=>a+b,0)/prices.length;

    res.json({
      average: avg.toFixed(2),
      count: prices.length
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
