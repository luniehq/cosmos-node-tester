const fetch = require('node-fetch')

// functions/hello.js
exports.handler = async event => {
  const api = event.queryStringParameters.api

  if (!api) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        errors: ['You need to provide an "?api" query parameters']
      })
    }
  }

  const {errors, successes} = await check(api)

  return {
    statusCode: 200,
    body: JSON.stringify({
      errors,
      successes
    })
  }
}

const sdkRoutes = [
  `/staking/parameters`,
  `/slashing/parameters`,
  `/slashing/validators/cosmos1/signing_info`,
  `/validatorsets/latest`,
  `/staking/validators`,
  `/gov/proposals`,
  `/staking/pool`,
  `/gov/parameters/deposit`,
  `/gov/parameters/tallying`,
  `/bank/balances/cosmos1`,
  `/auth/accounts/cosmos1`,
  `/staking/delegators/cosmos1/delegations`,
  `/staking/delegators/cosmos1/unbonding_delegations`,
  `/staking/redelegations`,
  `/minting/annual-provisions`,
  `/distribution/delegators/cosmos1/rewards`,
  `/txs?tx.height=1`
]

async function check (cosmosAPIUrl) {
  const errors = []
  const successes = []

  await Promise.all(
    sdkRoutes.map(route => {
      return fetch(`${cosmosAPIUrl.trim('/')}${route}`).then(res => {
        if (res.status === 404) {
          errors.push(`❌ Route ${route} not available`)
        } else {
          successes.push(`✅ Route ${route} is available!`)
        }
      })
        .catch(() => {
          errors.push(`❌ Route ${route} not available`)
        })
    }))

  return {errors, successes}
}
