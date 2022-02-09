#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import winston from 'winston'
import { execSync } from 'child_process'
import { FlockBase } from 'columba-sdk/js'

const myTransports = {
  file: new winston.transports.File({ filename: 'server.log' })
}

import execSh from 'exec-sh'

function testString (s : string) : boolean {
  return /^[A-Za-z0-9/\-:]+$/.test(s)
}

function testImage (s : string) : boolean {
  return /^[a-z0-9_]+$/.test(s)
}

/** Class implementing FlockManager
 * @extends FlockServer
 */

export class FlockManager extends FlockBase {
  flockInfo: Map<string, any>
  dataVolume: string
  constructor (
    obj: any
  ) {
    super(obj)
    this.dataVolume = 'flock-data'
    this.flockInfo = new Map<string, any>()
    process.on('SIGTERM', () => { this.shutdown() })
    process.on('SIGINT', () => { this.shutdown() })
    this.logger.add(myTransports.file)
  }

  override async initialize (): Promise<void> {
    this.logger.log('info', 'server initializing')
    await super.initialize()
    this.emitter.on('help', async (): Promise<void> => {
      this.send('help string')
    })

    this.emitter.on(
      'test', async (inobj: any): Promise<void> => {
        this.send(2 * parseInt(inobj.data.toString()))
      })

    this.emitter.on(
      'list', async (inobj: any): Promise<void> => {
        try {
          const out = await execSh.promise('podman images', true)
          this.send(out.stdout)
        } catch (e : any) {
          this.send(e.stderr)
        }
      })

    this.emitter.on(
      'ps', async (inobj: any): Promise<void> => {
        try {
          const out = await execSh.promise('podman ps', true)
          this.send(out.stdout)
        } catch (e : any) {
          this.send(e.stderr)
        }
      })
    this.emitter.on(
      'port', async (inobj: any): Promise<void> => {
        const s = inobj.data.trim()
        try {
          const out = execSync(`podman port ${s}`)
          const portString = out.toString().trim()
          const r = portString.split(/\r?\n/).map((x: string) =>
            x.split(/\s+->\s+/))
          this.send(r)
        } catch (err) {
          this.send(err)
        }
      }
    )

    this.emitter.on(
      'port-connect', async (inobj: any): Promise<void> => {
        const s = inobj.data.trim()
        try {
          const out = execSync(`podman port ${s}`)
          const portString = out.toString().trim()
          const r = portString.split(/\r?\n/).map((x: string) =>
            x.split(/\s+->\s+/))
          let conPort = ''
          let pubPort = ''
          r.forEach((l: any) => {
            if (l[0] === '3000/tcp') {
              conPort = l[1].split(':')[1]
            } else if (l[0] === '3001/tcp') {
              pubPort = l[1].split(':')[1]
            }
          })
          if (pubPort === '') {
            this.send([conPort])
          } else {
            this.send([conPort, pubPort])
          }
        } catch (err) {
          this.send(err)
        }
      }
    )

    this.emitter.on(
      'run', async (inobj: any): Promise<void> => {
        try {
          const s: string = inobj.data.trim()
          if (!testString(s)) {
            this.send('invalid image')
            return
          }
          const out = execSync(
            `podman run -d -P -v ${this.dataVolume}:/data --net slirp4netns:allow_host_loopback=true  ${s}`
          )
          const flockId = out.toString().trim()
          this.send(flockId)
          this.logger.log('info', 'running %s', flockId)
          this.flockInfo.set(flockId, {})
        } catch (e : any) {
          this.send(e.stderr)
        }
      })

    this.emitter.on(
      'stop', async (inobj: any) : Promise<void> => {
        try {
          const s : string = inobj.data.trim()
          if (s === '--all') {
            this.stopAll()
            this.send('')
          } else if (!testImage(s)) {
            this.send('invalid image')
          } else {
            const out =
                  await execSh.promise(
                      `podman stop ${s}`
                  )
            this.send(out.stdout)
          }
        } catch (e : any) {
          this.send(e.stderr)
        }
      })

    this.emitter.on(
      'debug', async (inobj: any) : Promise<void> => {
        if (inobj.data === 'on') {
          myTransports.file.level = 'debug'
          this.send('debug on')
        } else if (inobj.data === 'off') {
          myTransports.file.level = 'info'
          this.send('debug off')
        }
      })
  }

  async stopAll () : Promise<void> {
    Promise.all(Array.from(this.flockInfo.keys()).map(id => {
      this.logger.log('info', 'stopping %s', id)
      return execSh.promise(
        `podman stop ${id}`, true
      )
    }))
  }

  override async shutdown () : Promise<void> {
    this.logger.info('Shutting down')
    await this.stopAll()
    process.exit(0)
  }

  override version () : string {
    return 'FlockManager'
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  FlockManager.runServer()
}
