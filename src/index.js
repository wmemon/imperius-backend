import { Hono } from 'hono';

// Initialize Hono app
const app = new Hono();

// Function to check domain availability
async function checkDomainAvailability(domainName) {
  const apiKey = 'f2825c140329e4cb2d600';
  const endpoint = `https://www.namesilo.com/api/checkRegisterAvailability?version=1&type=json&key=${apiKey}&domains=${encodeURIComponent(domainName)}`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.reply.code === 300 && data.reply.detail === 'success') {
      if (data.reply.available) {
        return { available: true, price: data.reply.available.domain.price };
      } else {
        return { available: false };
      }
    } else {
      throw new Error('Failed to check domain availability');
    }
  } catch (error) {
    console.error('Error checking domain availability:', error);
    throw error;
  }
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
async function getCryptoPrice(id) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}`;
  const options = {
    method: 'GET',
    headers: { 
      accept: 'application/json',
      'x-cg-demo-api-key': 'CG-igXaxww4mqKs2rbrhpHrVBWc' 
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
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
    } else {
      return null;
    }
  } catch (error) {
    console.error('error:', error);
    return null;
  }
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
    } else {
      return c.json({ error: 'Cryptocurrency not found' }, 404);
    }
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to get token details
app.get('/getTokenDetails', async (c) => {
  console.log("Reaching here");
  const tokenAddress = c.req.query('tokenAddress');
  const headers = {
    'X-QKNTL-KEY': 'ae43ddc3e7c4442f905d89336b960563',
  };
  
  try {
    const response = await fetch('https://api.quickintel.io/v1/getquickiauditfull', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chain: 'eth',
        tokenAddress: tokenAddress,
      })
    });
    
    const data = await response.json();
    const {
      tokenDetails: { tokenName, tokenSymbol, tokenOwner, tokenSupply },
      tokenDynamicDetails: { is_Honeypot, lp_Locks },
    } = data;

    const result = {
      tokenName,
      tokenSymbol,
      tokenOwner,
      tokenSupply,
      isHoneypot: is_Honeypot,
      lpLocks: lp_Locks !== null ? lp_Locks : "Burned",
    };

    return c.json(result);
  } catch (error) {
    console.error('Error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to get token events
app.get('/getTokenEvents', async (c) => {
  try {
    const response = await fetch('https://developers.coinmarketcal.com/v1/events', {
      headers: {
        'x-api-key': 'CO9FGdFk1s3vS3PuPY4XV5tJU43PBeuC8V5QUBqx',
        'Accept-Encoding': 'deflate, gzip',
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    const top5Events = data.body.slice(0, 5).map(event => ({
      title: event.title.en,
      fullname: event.coins[0].fullname,
    }));

    return c.json(top5Events);
  } catch (error) {
    console.error('Error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to get top gainers
app.get('/getTopGainers', async (c) => {
  try {
    const response = await fetch('https://graph.defined.fi/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: '7b7401b9f6ca72eeb7fd977c113dc0dd20b1c034',
      },
      body: JSON.stringify({
        query: `
          {
            listTopTokens(limit: 10, networkFilter: 1, resolution: "1D") {
              address
              decimals
              exchanges {
                address
                id
                name
                iconUrl
                networkId
                tradeUrl
              }
              id
              liquidity
              name
              networkId
              price
              priceChange
              priceChange1
              priceChange4
              priceChange12
              priceChange24
              resolution
              symbol
              topPairId
              volume
            }
          }
        `,
      }),
    });

    const data = await response.json();
    const topGainers = data.data.listTopTokens.map(token => ({
      name: token.name,
      symbol: token.symbol,
      price: token.price,
      priceChange: token.priceChange,
      priceChange1: token.priceChange1,
      priceChange4: token.priceChange4,
      priceChange12: token.priceChange12,
      priceChange24: token.priceChange24,
      volume: token.volume,
    }));

    return c.json(topGainers);
  } catch (error) {
    console.error('Error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to get latest tokens
app.get('/getLatestTokens', async (c) => {
  try {
    const response = await fetch('https://graph.defined.fi/graphql', {
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
                traceIndex
                transactionHash
                blockHash
                timeCreated
                creatorAddress
                creatorBalance
                tokenName
                totalSupply
                tokenSymbol
                decimals
                simulationResults {
                  buySuccess
                  buyTax
                  buyGasUsed
                  sellSuccess
                  sellTax
                  sellGasUsed
                  canTransferOwnership
                  canRenounceOwnership
                  isOwnerRenounced
                  openTradingCall
                }
              }
            }
          }
        `,
      }),
    });

    const data = await response.json();
    const latestTokens = data.data.getLatestTokens.items.map(token => ({
      id: token.id,
      tokenAddress: token.tokenAddress,
      networkId: token.networkId,
      blockNumber: token.blockNumber,
      transactionIndex: token.transactionIndex,
    }));

    return c.json(latestTokens);
  } catch (error) {
    console.error('Error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Endpoint to list coins
app.get('/listCoins', async (c) => {
  try {
    const response = await fetch('https://www.livecoinwatch.com/tools/api', {
      method: 'POST',
      headers: {
        'x-api-key': "4a181ab9-993f-47b4-a51a-891731192a49",
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currency: "USD",
        sort: "rank",
        order: "ascending",
        offset: 0,
        limit: 5,
        meta: true
      }),
    });

    const data = await response.json();
    const result = data.map(coin => ({
      name: coin.name,
      symbol: coin.symbol,
      price: coin.price,
      marketCap: coin.marketCap,
      volume: coin.volume,
    }));

    return c.json(result);
  } catch (error) {
    console.error('Error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Export the worker
export default app;