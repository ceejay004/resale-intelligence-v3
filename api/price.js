export const config = { runtime: "nodejs" };

// simple in-memory cache
const cache = {};

export default async function handler(req, res) {

  const item = req.query.item?.toLowerCase();
  if (!item) return res.status(400).json({ error: "No item provided" });

  // 6 hour cache
  const CACHE_TIME = 1000 * 60 * 60 * 6;

  if (cache[item] && Date.now() - cache[item].time < CACHE_TIME) {
    return res.json({ ...cache[item].data, cached: true });
  }

  try {

    const url = "https://svcs.ebay.com/services/search/FindingService/v1";

    const params = new URLSearchParams({
      "OPERATION-NAME": "findCompletedItems",
      "SERVICE-VERSION": "1.13.0",
      "SECURITY-APPNAME": process.env.EBAY_APP_ID,
      "RESPONSE-DATA-FORMAT": "JSON",
      "REST-PAYLOAD": "",
      "keywords": item,
      "itemFilter(0).name": "SoldItemsOnly",
      "itemFilter(0).value": "true",
      "paginationInput.entriesPerPage": "20",
      "GLOBAL-ID": "EBAY-GB"
    });

    const r = await fetch(url + "?" + params.toString(), {
      headers: { "X-EBAY-SOA-GLOBAL-ID": "EBAY-GB" }
    });

    const data = await r.json();

    const items =
      data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

    if (!items.length)
      return res.json({ error: "No sold listings found" });

    const prices = items
      .map(i => parseFloat(i.sellingStatus[0].currentPrice[0].__value__))
      .filter(p => !isNaN(p));

    const avg = prices.reduce((a,b)=>a+b,0)/prices.length;

    const result = {
      average: avg.toFixed(2),
      samples: prices.length
    };

    // save cache
    cache[item] = { data: result, time: Date.now() };

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
