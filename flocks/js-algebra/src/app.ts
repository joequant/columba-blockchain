#!/usr/bin/env node
import winston from 'winston'
import { FlockBase, isObject, getErrorMessage } from 'columba-sdk/js'
import Algebrite from 'algebrite'

const myTransports = {
  file: new winston.transports.File({ filename: 'server.log' })
}

/**
 * simple class that monitors beacon events and evaluates
 * to computations
 */

export class JsAlgebra extends FlockBase {
  constructor (obj: unknown) {
    super(obj)
    this.logger.add(myTransports.file)
  }

  override async initialize (): Promise<void> {
    await super.initialize()
    this.emitter.on('test', async (inobj): Promise<void> => {
      const retval = 2 * parseInt(inobj.data.toString(), 10)
      await this.send(retval)
    })
    this.emitter.on('eval', async (inobj): Promise<void> => {
      await this.send(Algebrite.eval(inobj.data).toString())
    })
    this.emitter.on(
      'subscribe',
      async (inobj): Promise<void> => {
        this.beacon.subscribe(inobj.data)
        this.send(`subscribed to ${inobj.data}`)
      })
    this.emitter.on(
      'unsubscribe',
      async (inobj): Promise<void> => {
        this.beacon.unsubscribe(inobj.data)
        this.send(`unsubscribed to ${inobj.data}`)
      })
  }

  override async beaconProcessTxn (filter: string, inobj: any) : Promise<boolean> {
    const data = inobj.data
    if (!isObject(data)) {
      return false
    }
    if (data.cmd === 'js-algebra.eval') {
      let result: string
      let status = 0
      try {
        result = Algebrite.eval(data.eval).toString()
      } catch (e) {
        result = getErrorMessage(e)
        status = 1
      }
      const beaconResp = await this.beacon.send({
        cmd: 'block',
        subcmd: filter,
        data: {
          eval: data.eval,
          result: result,
          status: status
        }
      })
      this.logger.log('info', beaconResp)
    }
    return true
  }

  override version () : string {
    return 'JsAlgebra'
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  JsAlgebra.runServer()
}
