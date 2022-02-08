#!/usr/bin/env node
import { FlockBase } from 'columba-sdk/js'

export class ExampleJsFlock extends FlockBase {
  override async initialize (): Promise<void> {
    await super.initialize()
    this.emitter.on('test', async (inobj): Promise<void> => {
      const retval = 2 * parseInt(inobj.data.toString(), 10)
      await this.send(retval)
    })
  }

  override version () : string {
    return 'ExampleJsFlock'
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  ExampleJsFlock.runServer()
}
