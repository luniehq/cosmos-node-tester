<template>
  <div id="app">
    <h1>Lunie Node Endpoint Tester</h1>
    <h2>For Cosmos SDK based blockchain nodes</h2>
    <p>
      For Lunie integrations, we require two queryable endpoints from your node.
    </p>
    <ol>
      <li>
        The first is the Cosmos SDK REST API, so we can read the chain's state
        data. This endpoint needs to be available via
        <code>https</code>.
      </li>
      <li>
        The second is a Tendermint websocket connection to react to on chain
        events, like a new block. This websocket needs to be available via
        <code>wss</code>.
      </li>
    </ol>
    <p>
      Using this node endpoint tester tool, you can test the 2 endpoints from
      your nodes.
    </p>
    <label for="">REST API Endpoint</label>
    <input v-model="restURL" placeholder="https://cosmos-hub-3.lunie.io" />
    <br />
    <label for="">Websocket Endpoint</label>
    <input
      v-model="tendermintUrl"
      placeholder="wss://cosmos-hub-3.lunie.io/websocket"
    />
    <br />
    <button class="learn-more" @click="check" :disabled="loading">
      {{ loading ? "Loading..." : "Test Endpoints" }}
    </button>
    <ul>
      <li class="line success" v-for="success in successes" :key="success">
        {{ success }}
      </li>
      <li class="line error" v-for="error in errors" :key="error">
        {{ error }}
      </li>
    </ul>
  </div>
</template>

<script>
import Tendermint from './tendermint'
export default {
  name: 'App',
  data: () => ({
    restURL: 'https://cosmos-hub-3.lunie.io',
    tendermintUrl: 'wss://cosmos-hub-3.lunie.io/websocket',
    errors: [],
    successes: [],
    loading: false
  }),
  methods: {
    async check () {
      this.errors = []
      this.successes = []
      this.loading = true

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

      const tendermint = Tendermint()

      await Promise.all([
        new Promise((resolve, reject) => {
          tendermint
            .connect(this.tendermintUrl)
            .then(connectedClient => {
              this.successes.push(`✅ Tendermint websocket reachable`)

              const timeout = setTimeout(() => {
                reject(
                  new Error(`❌ Timed out waiting for websocket on Tendermint`)
                )
              }, 10000)

              connectedClient.subscribe(
                { query: "tm.event='NewBlock'" },
                event => {
                  clearTimeout(timeout)
                  this.successes.push(
                    `✅ Received new block from Tendermint websocket`
                  )
                  tendermint.disconnect()
                  resolve()
                }
              )
            })
            .catch(error => {
              this.errors.push(
                `❌ Tendermint websocket not reachable: ${error}`
              )
              this.loading = false
            })
        }),
        Promise.all(
          sdkRoutes.map(route => {
            return fetch(`${this.restURL.trim('/')}${route}`).then(res => {
              if (res.status === 404) {
                this.errors.push(`❌ Route ${route} not available`)
              } else {
                this.successes.push(`✅ Route ${route} is available!`)
              }
            })
              .catch(() => {
                this.errors.push(`❌ Route ${route} not available`)
              })
          }))

      ])

      this.loading = false

      // success if non failed
      this.success = this.errors.length === 0
    }
  }
}
</script>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  line-height: 24px;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 60px auto;
  max-width: 700px;
}

h1 {
  font-size: 50px;
  line-height: 70px;
  margin-bottom: 0;
  -webkit-text-stroke-width: 2px;
}

h2 {
  font-size: 30px;
  -webkit-text-stroke-width: 1px;
  font-style: italic;
  margin-top: 10px;
  margin-bottom: 30px;
}

h1,
h2 {
  color: #f9c4d2;
  -webkit-text-fill-color: #f9c4d2; /* Will override color (regardless of order) */
  -webkit-text-stroke-color: #b18597;
}

p {
  margin-bottom: 20px;
}

li {
  padding-bottom: 20px;
}

code {
  background: #eaeaea;
  padding: 1px;
}

label {
  font-size: 14px;
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 10px;
  margin-bottom: 20px;
  font-size: 16px;
  box-sizing: border-box;
  border-radius: 3px;
  border: 1px solid lightgrey;
}

.line {
  display: block;
  text-align: left;
}

button {
  width: 100%;
  margin: 30px auto 50px;

  position: relative;
  display: inline-block;
  cursor: pointer;
  outline: none;
  border: 0;
  vertical-align: middle;
  text-decoration: none;
  font-size: inherit;
  font-family: inherit;
}

button.learn-more {
  font-weight: 600;
  color: #382b22;
  text-transform: uppercase;
  padding: 1.25em 2em;
  background: #fff0f0;
  border: 2px solid #b18597;
  border-radius: 0.75em;
  -webkit-transform-style: preserve-3d;
  transform-style: preserve-3d;
  -webkit-transition: background 150ms cubic-bezier(0, 0, 0.58, 1),
    -webkit-transform 150ms cubic-bezier(0, 0, 0.58, 1);
  transition: background 150ms cubic-bezier(0, 0, 0.58, 1),
    -webkit-transform 150ms cubic-bezier(0, 0, 0.58, 1);
  transition: transform 150ms cubic-bezier(0, 0, 0.58, 1),
    background 150ms cubic-bezier(0, 0, 0.58, 1);
  transition: transform 150ms cubic-bezier(0, 0, 0.58, 1),
    background 150ms cubic-bezier(0, 0, 0.58, 1),
    -webkit-transform 150ms cubic-bezier(0, 0, 0.58, 1);
}

button.learn-more::before {
  position: absolute;
  content: "";
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f9c4d2;
  border-radius: inherit;
  box-shadow: 0 0 0 2px #b18597, 0 0.625em 0 0 #ffe3e2;
  -webkit-transform: translate3d(0, 0.75em, -1em);
  transform: translate3d(0, 0.75em, -1em);
  -webkit-transition: box-shadow 150ms cubic-bezier(0, 0, 0.58, 1),
    -webkit-transform 150ms cubic-bezier(0, 0, 0.58, 1);
  transition: box-shadow 150ms cubic-bezier(0, 0, 0.58, 1),
    -webkit-transform 150ms cubic-bezier(0, 0, 0.58, 1);
  transition: transform 150ms cubic-bezier(0, 0, 0.58, 1),
    box-shadow 150ms cubic-bezier(0, 0, 0.58, 1);
  transition: transform 150ms cubic-bezier(0, 0, 0.58, 1),
    box-shadow 150ms cubic-bezier(0, 0, 0.58, 1),
    -webkit-transform 150ms cubic-bezier(0, 0, 0.58, 1);
}

button.learn-more:hover {
  background: #ffe9e9;
  -webkit-transform: translate(0, 0.25em);
  transform: translate(0, 0.25em);
}

button.learn-more:hover::before {
  box-shadow: 0 0 0 2px #b18597, 0 0.5em 0 0 #ffe3e2;
  -webkit-transform: translate3d(0, 0.5em, -1em);
  transform: translate3d(0, 0.5em, -1em);
}

button.learn-more:active {
  background: #ffe9e9;
  -webkit-transform: translate(0em, 0.75em);
  transform: translate(0em, 0.75em);
}

button.learn-more:active::before {
  box-shadow: 0 0 0 2px #b18597, 0 0 #ffe3e2;
  -webkit-transform: translate3d(0, 0, -1em);
  transform: translate3d(0, 0, -1em);
}
</style>
