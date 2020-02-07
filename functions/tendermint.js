/*
 * This file handels subscriptions via Tendermint through Websockets
 * Usage:
 *  const tendermint = Tendermint().connect(websocketURL)
 *  tendermint.subscribe({ query: "tm.event='NewBlock'" }, async event => {
 *    console.log(event)
 *  })
 */

/* istanbuld ignore file: mostly websocket logic */
/* global WebSocket */

'use strict'

const camel = require(`camelcase`)

const connectionTimeoutInterval = 5000

module.exports = function tendermintConnect () {
  const client = {
    socket: undefined,
    subscriptions: [],
    ondisconnect: undefined,
    isConnected () {
      return this.socket && this.socket.readyState === WebSocket.OPEN
    },
    async disconnect () {
      try {
        await this.unsubscribeAll()
      } catch (error) {
        // ignore error because throws if nothing to unsubscribe
      }
      this.subscriptions = []
      this.socket.close()
    },
    async connect (websocketEndpoint) {
      // if we have an existing connection, first disconnect that one
      if (this.isConnected()) {
        await this.disconnect()
      }

      let socket
      try {
        socket = await connect(websocketEndpoint)
      } catch (error) {
        throw new Error('Connecting to Tendermint Websocket failed', error)
      }
      this.socket = socket

      const handler = function (event) {
        let { id: eventId, error, result } = JSON.parse(event.data)
        const isSubscriptionEvent = eventId.indexOf('#event') !== -1
        if (isSubscriptionEvent) {
          eventId = eventId.replace('#event', '')
        }

        const subscription = this.subscriptions.find(({ id }) => eventId === id)
        if (subscription) {
          if (isSubscriptionEvent && result) {
            subscription.callback(result.data.value)
            return
          }

          if (error) {
            subscription.reject(error)
          } else {
            subscription.resolve(result)
          }

          // remove single subscription
          if (subscription.method !== 'subscribe') {
            this.subscriptions = this.subscriptions.filter(
              ({ id }) => eventId !== id
            )
          }
        }
      }.bind(this)

      this.socket.onmessage = handler
      this.socket.onerror = handler

      // poll websocket connection
      setInterval(() => this.pollConnection(), connectionTimeoutInterval * 6)

      this.subscriptions.forEach(subscription =>
        this.startSubscription(subscription)
      )

      return this
    },
    pollConnection () {
      let connectionTimeout = setTimeout(
        function () {
          if (this.ondisconnect) this.ondisconnect()
        }.bind(this),
        connectionTimeoutInterval
      )
      this.health().then(() => clearTimeout(connectionTimeout))
    },
    subscribe (args, callback, method = 'subscribe') {
      const id = Math.random().toString(36)
      const parameters = convertWsArgs(args)

      return new Promise((resolve, reject) => {
        const subscription = {
          id,
          method,
          parameters,
          callback,
          resolve,
          reject
        }
        this.subscriptions.push(subscription)

        if (this.isConnected()) {
          this.startSubscription(subscription)
        }
      })
    },
    startSubscription ({ id, method, parameters }) {
      this.socket.send(
        JSON.stringify({
          jsonrpc: `2.0`,
          id,
          method,
          params: parameters
        })
      )
    }
  }

  for (const name of tendermintMethods) {
    client[camel(name)] = function (args) {
      return client.subscribe(args, undefined, name)
    }
  }

  return client
}

// websocketEndpoint is ws://localhost:26657/websocket for a normal Tendermint full node
// remember that for a https served website you need to have a wss (secure websocket) endpoint in place
// to do so, you can reverse proxy the Tendermint full node using Nginx or Caddy
async function connect (websocketEndpoint) {
  const socket = new WebSocket(websocketEndpoint)

  await new Promise((resolve, reject) => {
    socket.onopen = resolve
    socket.onclose = reject
  })

  return socket
}

const tendermintMethods = [
  `unsubscribe`,
  `unsubscribe_all`,

  `status`,
  `net_info`,
  `dial_peers`,
  `dial_seeds`,
  `blockchain`,
  `genesis`,
  `health`,
  `block`,
  `block_results`,
  `blockchain`,
  `validators`,
  `consensus_state`,
  `dump_consensus_state`,
  `broadcast_tx_commit`,
  `broadcast_tx_sync`,
  `broadcast_tx_async`,
  `unconfirmed_txs`,
  `num_unconfirmed_txs`,
  `commit`,
  `tx`,
  `tx_search`,

  `abci_query`,
  `abci_info`,

  `unsafe_flush_mempool`,
  `unsafe_start_cpu_profiler`,
  `unsafe_stop_cpu_profiler`,
  `unsafe_write_heap_profile`
]

function convertWsArgs (args = {}) {
  for (const k in args) {
    const v = args[k]
    if (typeof v === `number`) {
      args[k] = String(v)
    } else if (Buffer.isBuffer(v)) {
      args[k] = `0x` + v.toString(`hex`)
    } else if (v instanceof Uint8Array) {
      args[k] = `0x` + Buffer.from(v).toString(`hex`)
    }
  }
  return args
}
