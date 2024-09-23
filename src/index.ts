import { Hono } from 'hono';

// Initialize Hono app
const app = new Hono();

// CORS Middleware
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');

  // If the method is OPTIONS, return early
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  await next();
});


// Helper function for API fetch
async function fetchAPI(url: string, options: RequestInit = {}): Promise<any> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed to fetch from API');
  }
}

// Function to check domain availability
async function checkDomainAvailability(domainName: string) {
  const apiKey = 'f2825c140329e4cb2d600';
  const endpoint = `https://www.namesilo.com/api/checkRegisterAvailability?version=1&type=json&key=${apiKey}&domains=${encodeURIComponent(domainName)}`;

  const data = await fetchAPI(endpoint);

  if (data.reply.code === 300 && data.reply.detail === 'success') {
    if (data.reply.available) {
      return { available: true, price: data.reply.available.domain.price };
    }
    return { available: false };
  }

  throw new Error('Failed to check domain availability');
}

// Endpoint to check domain availability
app.get('/checkDomain', async (c) => {
  const domainName = c.req.query('domain');
  if (!domainName) {
    return c.json({ error: 'Domain name is required' }, 400);
  }

  try {
    const result = await checkDomainAvailability(domainName);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Function to get crypto price
async function getCryptoPrice(id: string) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-cg-demo-api-key': 'CG-igXaxww4mqKs2rbrhpHrVBWc'
    }
  };

  const data = await fetchAPI(url, options);

  if (data && data.length > 0) {
    const crypto = data[0];
    return {
      [crypto.id]: {
        usd: crypto.current_price,
        usd_market_cap: crypto.market_cap,
        usd_24h_vol: crypto.total_volume,
        usd_24h_change: crypto.price_change_percentage_24h,
        last_updated_at: crypto.last_updated
      }
    };
  }

  return null;
}

// Endpoint to get crypto price
app.get('/getCryptoPrice', async (c) => {
  const id = c.req.query('id');
  if (!id) {
    return c.json({ error: 'Cryptocurrency ID is required' }, 400);
  }

  try {
    const result = await getCryptoPrice(id);
    if (result) {
      return c.json(result);
    }
    return c.json({ error: 'Cryptocurrency not found' }, 404);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to get token details
app.get('/getTokenDetails', async (c) => {
  const tokenAddress = c.req.query('tokenAddress');
  if (!tokenAddress) {
    return c.json({ error: 'Token address is required' }, 400);
  }

  try {
    const headers = {
      'X-QKNTL-KEY': 'ae43ddc3e7c4442f905d89336b960563',
      'Content-Type': 'application/json',
    };

    const response = await fetchAPI('https://api.quickintel.io/v1/getquickiauditfull', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chain: 'eth',
        tokenAddress,
      }),
    });

    const {
      tokenDetails: { tokenName, tokenSymbol, tokenOwner, tokenSupply },
      tokenDynamicDetails: { is_Honeypot, lp_Locks },
    } = response;

    const result = {
      tokenName,
      tokenSymbol,
      tokenOwner,
      tokenSupply,
      isHoneypot: is_Honeypot,
      lpLocks: lp_Locks || 'Burned',
    };

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to get token events
app.get('/getTokenEvents', async (c) => {
  try {
    const response = await fetchAPI('https://developers.coinmarketcal.com/v1/events', {
      headers: {
        'x-api-key': 'CO9FGdFk1s3vS3PuPY4XV5tJU43PBeuC8V5QUBqx',
        'Accept': 'application/json',
      },
    });

    const top5Events = response.body.slice(0, 5).map((event: any) => ({
      title: event.title.en,
      fullname: event.coins[0].fullname,
    }));

    return c.json(top5Events);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to get top gainers
app.get('/getTopGainers', async (c) => {
  try {
    const response = await fetchAPI('https://graph.defined.fi/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: '7b7401b9f6ca72eeb7fd977c113dc0dd20b1c034',
      },
      body: JSON.stringify({
        query: `
          {
            listTopTokens(limit: 10, networkFilter: 1, resolution: "1D") {
              name
              symbol
              price
              priceChange
              volume
            }
          }
        `,
      }),
    });

    return c.json(response.data.listTopTokens);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to get latest tokens
app.get('/getLatestTokens', async (c) => {
  try {
    const response = await fetchAPI('https://graph.defined.fi/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: '57efd78a3f4001cdd24b36f13358e407e86e4f22',
      },
      body: JSON.stringify({
        query: `
          {
            getLatestTokens(limit: 5, networkFilter: 1) {
              items {
                id
                tokenAddress
                networkId
                blockNumber
                transactionIndex
              }
            }
          }
        `,
      }),
    });

    return c.json(response.data.getLatestTokens.items);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to list coins
app.get('/listCoins', async (c) => {
  try {
    const response = await fetchAPI('https://www.livecoinwatch.com/tools/api', {
      method: 'POST',
      headers: {
        'x-api-key': '4a181ab9-993f-47b4-a51a-891731192a49',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currency: 'USD',
        sort: 'rank',
        order: 'ascending',
        offset: 0,
        limit: 5,
        meta: true,
      }),
    });

    return c.json(response);
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Export the worker
export default app;
