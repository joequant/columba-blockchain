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
  blockchain: any;
  debug: boolean;
  constructor (
    obj: unknown
  ) {
    super(obj)
    this.blockchain = {}
    this.debug = false
  }

  private async getBlockchain (name: string) {
    if (this.blockchain[name] === undefined) {
      this.blockchain[name] =
        await new blockchain.AsyncBlockchain({ filename: name })
    }
    return this.blockchain[name]
  }

  override async initialize (): Promise<void> {
    await super.initialize()
    this.blockchain.default = await new blockchain.AsyncBlockchain()
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
          name = 'root'
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
