export const config = { runtime: "nodejs" };

export default async function handler(req, res) {

  const item = req.query.item;
  if (!item) return res.status(400).json({ error: "No item provided" });

  try {

    const url =
      "https://svcs.ebay.com/services/search/FindingService/v1" +
      "?OPERATION-NAME=findCompletedItems" +
      "&SERVICE-VERSION=1.13.0" +
      "&SECURITY-APPNAME=" + process.env.EBAY_APP_ID +
      "&RESPONSE-DATA-FORMAT=JSON" +
      "&REST-PAYLOAD" +
      "&keywords=" + encodeURIComponent(item) +
      "&itemFilter(0).name=SoldItemsOnly" +
      "&itemFilter(0).value=true" +
      "&paginationInput.entriesPerPage=20" +
      "&GLOBAL-ID=EBAY-GB";

    const r = await fetch(url);
    const data = await r.json();

    const items =
      data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

    if (items.length === 0)
      return res.json({ error: "No sold listings found" });

    const prices = items
      .map(i => parseFloat(i.sellingStatus[0].currentPrice[0].__value__))
      .filter(p => !isNaN(p));

    const avg = prices.reduce((a,b)=>a+b,0)/prices.length;

    res.json({
      average: avg.toFixed(2),
      samples: prices.length
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
