const { buildRows } = require("../lib/zohoPackages");

const ZAPIER_HOOK_URL = process.env.ZAPIER_HOOK_URL;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // Optional: protect the cron endpoint
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const rows = await buildRows();

    if (rows.length === 0) {
      return res.status(200).json({ message: "No new packages to sync." });
    }

    const results = [];

    for (const row of rows) {
      const hookRes = await fetch(ZAPIER_HOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });

      results.push({
        salesOrderId: row.salesOrderId,
        status: hookRes.ok ? "sent" : "failed",
        httpStatus: hookRes.status,
      });
    }

    console.log("Sync results:", results);
    return res.status(200).json({ synced: results.length, results });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: err.message });
  }
};
