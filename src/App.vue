<template>
  <div id="app">
    <h1>Lunie Cosmos SDK Node Tester</h1>
    <p>Lunie requires nodes to provide the Cosmos SDK REST API to read the chain state. The API needs to be available via https.</p>
    <p>Lunie requires a Tendermint Websocket connection to react to on chain events (like a new block). The websocket needs to be available via wss.</p>
    <p>On this page you can test the 2 endpoints.</p>
    <input v-model="restURL" placeholder="enter REST Url..." />
    <br />
    <input v-model="tendermintUrl" placeholder="enter Tendermint Url..." />
    <br />
    <button @click="check" :disabled="loading">Test Urls</button>
    <br />
    <span class="line success" v-for="success in successes" :key="success">{{success}}</span>
    <span class="line error" v-for="error in errors" :key="error">{{error}}</span>
  </div>
</template>

<script>
import Tendermint from './tendermint'
export default {
  name: 'App',
  data: () => ({
    restURL: 'https://cosmos-hub-3.lunie.io/',
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
        tendermint
          .connect(this.tendermintUrl)
          .then(connectedClient => {
            this.successes.push(`✔️ Tendermint Websocket reachable`)
            connectedClient.subscribe({ query: "tm.event='NewBlock'" }, event => {
              this.successes.push(`✔️ Received Block`)
              tendermint.disconnect()
            })
          })
          .catch(error => {
            this.errors.push(`❌ Tendermint Websocket not reachable: ${error}`)
          }),
        Promise.all(sdkRoutes.map(route => {
          return fetch(`${this.restURL.trim('/')}${route}`)
            .then(res => {
              if (res.status === 404) {
                this.errors.push(`❌ Route ${route} not available`)
              } else {
                this.successes.push(`✔️ Route ${route} is reachable`)
              }
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
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.line {
  display: block;
  text-align: left;
}
</style>
