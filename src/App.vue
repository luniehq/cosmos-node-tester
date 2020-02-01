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
    <span v-if="success">The provided endpoints are compatible to be used by Lunie</span>
    <br />
    <span v-if="restError">Cosmos SDK REST API is not reachable: {{ restError }}</span>
    <br />
    <span v-if="tendermintError">Tendermint Websockets are not reachable: {{ tendermintError }}</span>
  </div>
</template>

<script>
export default {
  name: "App",
  data: () => ({
    restURL: undefined,
    tendermintUrl: undefined,
    tendermintError: false,
    restError: false,
    success: false,
    loading: false
  }),
  methods: {
    async check() {
      this.tendermintError = undefined;
      this.restError = undefined;
      this.success = false;

      this.loading = true;

      const responses = await Promise.all([
        new Promise((resolve, reject) => {
          const socket = new WebSocket(this.tendermintUrl);
          socket.onopen = resolve;
          socket.onclose = reject;
        })
          .then(() => true)
          .catch(error => {
            this.tendermintError = error;
            return false;
          }),
        fetch(`${this.restURL.trim("/")}/staking/validators`)
          .then(res => res.json())
          .then(() => true)
          .catch(error => {
            this.restError = error;
            return false;
          })
      ]);

      // success if non failed
      this.success = responses[0] && responses[1];
    }
  }
};
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
