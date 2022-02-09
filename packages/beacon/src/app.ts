#!/usr/bin/env node
// SPDX-License-Identifier: MIT

// Needed for vanilla-blockchain
import 'regenerator-runtime/runtime'

import blockchain = require('vanilla-blockchain')
import { FlockBase } from 'columba-sdk/js'

/** Class implementing Blockchain server
 * @extends FlockBase
 */

export class Beacon extends FlockBase {
  blockchain: Map<string, any>
  debug: boolean
  default_name = 'root'
  constructor (
    obj: unknown
  ) {
    super(obj)
    this.blockchain = new Map<string, any>()
    this.debug = false
  }

  private async getBlockchain (name: string) {
    if (this.blockchain.get(name) !== undefined) {
      this.blockchain.set(
        name,
        await new blockchain.AsyncBlockchain(
          { filename: name }
        )
      )
    }
    return this.blockchain.get(name)
  }

  override async initialize (): Promise<void> {
    await super.initialize()
    this.blockchain.set(
      this.default_name, await new blockchain.AsyncBlockchain(
        { filename: this.default_name}
      )
    )
    this.emitter.on('help', async (): Promise<void> => {
      this.send('help string')
    })

    this.emitter.on('echo', async (inobj): Promise<void> => {
      this.send(inobj.data)
    })

    this.emitter.on(
      'block', async (inobj) : Promise<void> => {
        let name = inobj.subcmd
        if (name === '' || name === undefined) {
          name = this.default_name
        }
        const blockchain = await this.getBlockchain(name)
        const { hash: previousHash } = blockchain.latestBlock
        const retval = await blockchain.addBlock(
          inobj.data, previousHash
        )
        this.send(retval)
        this.publish(name, retval)
      })

    this.emitter.on(
      'debug', async (inobj) : Promise<void> => {
        if (inobj.data === 'on') {
          this.debug = true
          this.send('debug on')
        } else if (inobj.data === 'off') {
          this.debug = false
          this.send('debug off')
        }
      })
  }

  override version () : string {
    return 'Beacon'
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  Beacon.runServer()
}
