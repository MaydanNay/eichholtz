

const ALGOLIA_APP_ID = 'L9823SLXQ4'
const ALGOLIA_API_KEY = 'ZTFlMGExYWIwMDg3MGMwYzRmZDZkYTAyNzc3MDJkYjNjNDUxNGMxMjFkZTY1ZjEyMGJhNzZlMzVkMTgzMGFiMGZpbHRlcnM9Y2F0YWxvZ19wZXJtaXNzaW9ucy5jdXN0b21lcl9ncm91cF8xJTIwJTIxJTNEJTIwMCZ0YWdGaWx0ZXJzPSZ2YWxpZFVudGlsPTE3ODM5NzA0OTA='
const ALGOLIA_INDEX = 'live_magento2_en_products'

async function testAlgolia() {
  const body = {
    requests: [
      {
        indexName: ALGOLIA_INDEX,
        params: 'query=January 2026&hitsPerPage=2'
      },
      {
        indexName: ALGOLIA_INDEX,
        params: 'query=The Met&hitsPerPage=2'
      },
      {
        indexName: ALGOLIA_INDEX,
        params: 'query=Corey Damen Jenkins&hitsPerPage=2'
      }
    ]
  }

  const res = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries`, {
    method: 'POST',
    headers: {
      'x-algolia-application-id': ALGOLIA_APP_ID,
      'x-algolia-api-key': ALGOLIA_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  
  data.results.forEach((r, i) => {
    console.log(`\n--- Result ${i} ---`)
    r.hits.forEach(h => {
      console.log('Name:', h.name)
      console.log('item_collection_launch:', h.item_collection_launch)
      console.log('categories:', JSON.stringify(h.categories, null, 2))
    })
  })
}

testAlgolia().catch(console.error);
