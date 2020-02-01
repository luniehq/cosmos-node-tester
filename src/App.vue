<template>
  <div id="app">
    <input v-model="restURL" placeholder="enter REST Url..." />
    <br />
    <input v-model="tendermintUrl" placeholder="enter Tendermint Url..." />
    <br />
    <button @click="check" :disabled="loading">Test Urls</button>
    <br />
    <span v-if="success">The provided endpoints are compatible to be used by Lunie</span>
    <br />
    <span v-if="restError">Cosmos SDK REST API is not reachable</span>
    <br />
    <span v-if="tendermintError">Tendermint Websockets are not reachable</span>
  </div>
</template>

<script>
export default {
  name: 'App',
  data: () => ({
    restURL: undefined,
    tendermintUrl: undefined,
    tendermintError: false,
    restError: false,
    success: false,
    loading: false
  }),
  methods: {
    async check () {
      this.tendermintError = false
      this.restError = false
      this.success = false

      this.loading = true

      const responses = await Promise.all([
        new Promise((resolve, reject) => {
          const socket = new WebSocket(this.tendermintUrl)
          socket.onopen = resolve
          socket.onclose = reject
        })
          .then(() => true)
          .catch(() => {
            this.tendermintError = true
            return false
          }),
        fetch(`${this.restURL.trim('/')}/staking/validators`)
          .then(res => res.json())
          .then(() => true)
          .catch(() => {
            this.restError = true
            return false
          })
      ])

      // success if non failed
      this.success = responses[0] && responses[1]
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
</style>
