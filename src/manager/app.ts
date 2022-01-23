#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import { execSync } from 'child_process'
import winston from 'winston'
import 'regenerator-runtime/runtime'
import util from 'util'
import FlockServer from 'pigeon-sdk/js/flock-server.js'

const transports = {
  file: new winston.transports.File({ filename: 'server.log' })
}

const logger = winston.createLogger({
  level: 'info',
  transports: [
    transports.file
  ]
})

const execShPromise = require('exec-sh').promise

function testString (s : string) : boolean {
  return /^[A-Za-z0-9/\-:]+$/.test(s)
}

function testImage (s : string) : boolean {
  return /^[a-z0-9_]+$/.test(s)
}

/** Class implementing FlockManager
 * @extends FlockServer
 */

class FlockManager extends FlockServer {
  pod: string;
  constructor (
    replySockId: string
  ) {
    super(replySockId)
    const out = execSync('podman pod create')
    this.pod = out.toString().trim()
    logger.info('created pod ' + this.pod)
    process.on('SIGTERM', () => { this.shutdown() })
    process.on('SIGINT', () => { this.shutdown() })
  }

  async initialize (): Promise<void> {
    await super.initialize()
    this.emitter.on('help', async (): Promise<void> => {
      this.send('help string')
    })

    this.emitter.on('echo', async (inobj: any): Promise<void> => {
      this.send(inobj.data)
    })

    this.emitter.on(
      'test', async (inobj: any): Promise<void> => {
        this.send(2 * parseInt(inobj.data.toString()))
      })

    this.emitter.on(
      'list', async (inobj: any): Promise<void> => {
        try {
          const out = await execShPromise('podman images', true)
          this.send(out.stdout)
        } catch (e : any) {
          this.send(e.stderr)
        }
      })

    this.emitter.on(
      'ps', async (inobj: any): Promise<void> => {
        try {
          const out = await execShPromise('podman ps', true)
          this.send(out.stdout)
        } catch (e : any) {
          this.send(e.stderr)
        }
      })

    this.emitter.on(
      'run', async (inobj: any): Promise<void> => {
        try {
          const s: string = inobj.data.trim()
          if (!testString(s)) {
            this.send('invalid image')
            return
          }
          const out =
                await execShPromise(
                  util.format(
                    'podman run -d --pod %s %s', this.pod, s
                  ), true)
          this.send(out.stdout)
        } catch (e : any) {
          this.send(e.stderr)
        }
      })

    this.emitter.on(
      'stop', async (inobj: any) : Promise<void> => {
        try {
          const s : string = inobj.data.trim()
          if (!testImage(s)) {
            this.send('invalid image')
          } else {
            const out =
                  await execShPromise(
                    util.format(
                      'podman stop -d %s', s
                    ))
            this.send(out.stdout)
          }
        } catch (e : any) {
          this.send(e.stderr)
        }
      })

    this.emitter.on(
      'debug', async (inobj: any) : Promise<void> => {
        if (inobj.data === 'on') {
          transports.file.level = 'debug'
          this.send('debug on')
        } else if (inobj.data === 'off') {
          transports.file.level = 'info'
          this.send('debug off')
        }
      })
  }

  async shutdown () : Promise<void> {
    logger.info('Shutting down ' + this.pod)
    try {
      await execShPromise('podman pod rm -f ' + this.pod, true)
      process.exit(0)
    } catch (e : any) {
      logger.info(e.stderr)
      process.exit(1)
    }
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  logger.info('starting FlockManager')
  const app = new FlockManager('tcp://127.0.0.1:3000')
  app.run()
}