const getAccessToken = async () => {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
  });

  const res = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?${params.toString()}`,
    { method: "POST" }
  );

  const data = await res.json();

  if (!data.access_token) {
    throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);
  }

  return data.access_token;
};

module.exports = { getAccessToken };
