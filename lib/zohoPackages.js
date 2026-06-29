const { getAccessToken } = require("./zohoAuth");

const ORG_ID = process.env.ZOHO_ORG_ID;
const BASE_URL = "https://www.zohoapis.com/inventory/v1";

// Fetch packages updated in the last 35 minutes
const fetchRecentPackages = async (accessToken) => {
  const now = new Date();
  const windowMs = 35 * 60 * 1000; // 35 min window (wider than 30 min cron)
  const since = new Date(now.getTime() - windowMs);

  // Zoho expects date filter in yyyy-mm-dd format for last_modified_time
  const sinceStr = since.toISOString().replace("T", " ").substring(0, 19);

  let allPackages = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${BASE_URL}/packages?organization_id=${ORG_ID}&last_modified_time=${encodeURIComponent(sinceStr)}&page=${page}&per_page=200`;

    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const data = await res.json();

    if (!res.ok || data.code !== 0) {
      throw new Error(`Zoho packages fetch failed: ${JSON.stringify(data)}`);
    }

    const packages = data.packages || [];
    allPackages = allPackages.concat(packages);

    // Zoho paginates — stop if fewer than 200 returned
    hasMore = packages.length === 200;
    page++;
  }

  return allPackages;
};

// Fetch full package detail to get shipment date/time
const fetchPackageDetail = async (accessToken, packageId) => {
  const url = `${BASE_URL}/packages/${packageId}?organization_id=${ORG_ID}`;

  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  const data = await res.json();

  if (!res.ok || data.code !== 0) {
    throw new Error(`Zoho package detail failed for ${packageId}: ${JSON.stringify(data)}`);
  }

  return data.package;
};

// Parse a Zoho datetime string into separate date and time parts
const parseDatetime = (datetimeStr) => {
  if (!datetimeStr) return { date: "", time: "" };
  // Zoho typically returns "2024-01-15 09:30:00" or ISO format
  const parts = datetimeStr.replace("T", " ").split(" ");
  return {
    date: parts[0] || "",
    time: parts[1] ? parts[1].substring(0, 8) : "",
  };
};

const buildRows = async () => {
  const accessToken = await getAccessToken();
  const packages = await fetchRecentPackages(accessToken);

  if (packages.length === 0) {
    console.log("No new packages found in window.");
    return [];
  }

  console.log(`Found ${packages.length} package(s) to process.`);

  const rows = [];

  for (const pkg of packages) {
    // Fetch detail to get shipment info
    const detail = await fetchPackageDetail(accessToken, pkg.package_id);

    const created = parseDatetime(detail.date || detail.created_time);
    const shipped = parseDatetime(detail.shipment_date || detail.shipped_date || "");

    rows.push({
      salesOrderId: detail.salesorder_number || detail.reference_number || "",
      packageCreatedDate: created.date,
      packageCreatedTime: created.time,
      actualShipDate: shipped.date,
      actualShipTime: shipped.time,
    });
  }

  return rows;
};

module.exports = { buildRows };
