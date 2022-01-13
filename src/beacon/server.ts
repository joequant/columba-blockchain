#!/usr/bin/env node
import zmq = require('zeromq')
import { encode, decode } from '@msgpack/msgpack'
import util = require('util')
import 'regenerator-runtime/runtime'
import blockchain = require('vanilla-blockchain')
import createLogger from 'logging'
const logger = createLogger('blockapp')
const execShPromise = require('exec-sh').promise

function testString (s : string) : boolean {
  return /^[A-Za-z0-9/\-:]+$/.test(s)
}

function testImage (s : string) : boolean {
  return /^[a-z0-9_]+$/.test(s)
}

async function startup (): Promise<string> {
  const out : any = await execShPromise('podman pod create', true)
  return out.stdout.trim()
}

async function shutdown (pod: string): Promise<void> {
  execShPromise('podman pod rm -f ' + pod, true)
}

async function run (
  pod: string,
  blockchain : any,
  sock : zmq.Reply,
  pubSock : zmq.Publisher
) : Promise<void> {
  for await (const [msg] of sock) {
    const inobj: any = decode(msg)
    let retval : any
    if (inobj.cmd === 'help') {
      retval = 'help string'
    } else if (inobj.cmd === 'echo') {
      retval = inobj.data
    } else if (inobj.cmd === 'test') {
      const data : any = decode(inobj.data)
      retval = 2 * parseInt(data.toString())
    } else if (inobj.cmd === 'list') {
      try {
        const out : any = await execShPromise('podman images', true)
        retval = out.stdout
      } catch (e : any) {
        retval = e.stderr
      }
    } else if (inobj.cmd === 'ps') {
      try {
        const out : any = await execShPromise('podman ps', true)
        retval = out.stdout
      } catch (e : any) {
        retval = e.stderr
      }
    } else if (inobj.cmd === 'run') {
      try {
        const s : string = inobj.data.trim()
        if (!testString(s)) {
          retval = 'invalid image'
        } else {
          const out : any =
                await execShPromise(
                  util.format(
                    'podman run --pod %s %s &', pod, s
                  ), {
                    detached: true,
                    stdio: 'ignore'
                  })
          retval = out.stdout
        }
      } catch (e : any) {
        retval = e.stderr
      }
    } else if (inobj.cmd === 'stop') {
      try {
        const s : string = inobj.data.trim()
        if (!testImage(s)) {
          retval = 'invalid image'
        } else {
          const out : any =
                await execShPromise(
                  util.format(
                    'podman stop %s &', s
                  ))
          retval = out.stdout
        }
      } catch (e : any) {
        retval = e.stderr
      }
    } else if (inobj.cmd === 'blockchain') {
      const { hash: previousHash } = blockchain.latestBlock
      retval = await blockchain.addBlock(inobj.data, previousHash)
      pubSock.send(encode(retval))
    } else {
      retval = 'unknown command'
    }
    await sock.send(encode(retval))
  }
}

async function main (): Promise<void> {
  let pod : string
  const replySock = new zmq.Reply()
  const pubSock = new zmq.Publisher()
  await replySock.bind('tcp://127.0.0.1:3000')
  await pubSock.bind('tcp://127.0.0.1:3001')
  const bc = await new blockchain.AsyncBlockchain()
  logger.info('starting blockchain')

  async function exit () : Promise<void> {
    console.log('Shutting down')
    try {
      await shutdown(pod)
      process.exit(0)
    } catch (e : any) {
      logger.info(e.stderr)
      process.exit(1)
    }
  }

  process.on('SIGTERM', exit)
  process.on('SIGINT', exit)

  try {
    pod = await startup()
    logger.info('created pod ' + pod)
    run(
      pod, bc, replySock, pubSock
    )
  } catch (e) {
    logger.info('unable to create pod')
  }
}

main()