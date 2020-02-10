const Tendermint = require('./tendermint')
const fetch = require('node-fetch')

// functions/hello.js
exports.handler = async event => {
  const rpc = event.queryStringParameters.rpc
  const api = event.queryStringParameters.api

  if (!api || !rpc) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        errors: ['You need to provide rpc and api query parameters']
      })
    }
  }

  const {errors, successes} = await check(rpc, api)

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

async function check (tendermintUrl, cosmosAPIUrl) {
  const errors = []
  const successes = []

  const tendermint = Tendermint()

  await Promise.all([
    new Promise((resolve, reject) => {
      tendermint
        .connect(tendermintUrl)
        .then(connectedClient => {
          successes.push(`✅ Tendermint websocket reachable`)

          const timeout = setTimeout(() => {
            reject(
              new Error(`❌ Timed out waiting for websocket on Tendermint`)
            )
          }, 10000)

          connectedClient.subscribe(
            { query: "tm.event='NewBlock'" },
            event => {
              clearTimeout(timeout)
              successes.push(
                `✅ Received new block from Tendermint websocket`
              )
              tendermint.disconnect()
              resolve()
            }
          )
        })
        .catch(error => {
          errors.push(
            `❌ Tendermint websocket not reachable: ${error}`
          )
          resolve()
        })
    }),
    Promise.all(
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
  ])

  return {errors, successes}
}
