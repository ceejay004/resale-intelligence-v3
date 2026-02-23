const auth = Buffer.from(
  process.env.EBAY_APP_ID + ":" + process.env.EBAY_CERT_ID
).toString("base64");
