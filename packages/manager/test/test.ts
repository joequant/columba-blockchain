import assert from 'assert'
import { FlockCli } from 'columba-sdk/js'
import { FlockManager } from '..'
let app: FlockManager
let cli: FlockCli

describe('Manager', function () {
  before(async function () {
    app = new FlockManager({
      conport: 'tcp://127.0.0.1:3000'
    })
    cli = new FlockCli()
    app.run()
    await cli.portConnect('default', 'tcp://127.0.0.1:3000')
  })

  after(async function () {
    app.stopAll()
  })

  describe('echo', () => {
    let beacon : string
    it('echo', async () => {
      const r = await cli.send('echo hello world')
      assert.equal(r, 'hello world')
    })
    it('list', async () => {
      const r = await cli.send('list')
      assert.ok(r.includes('localhost/columba-beacon'))
    })
    it('run', async () => {
      beacon = await cli.send('run localhost/columba-beacon')
      assert.ok(beacon.match(/[0-9a-f]+/))
    })
    it('ps', async () => {
      const r = await cli.send('ps')
      assert.ok(r.includes('localhost/columba-beacon'))
    })
    let port : string
    it('port', async () => {
      const r = await cli.send(`port ${beacon}`)
      r.forEach((l: string) => {
        if (l[0] === '3000/tcp') {
          port = l[1].split(':')[1]
        }
      })
    })
    it('.port-connect', async () => {
      await cli.send('.port-connect blockchain ' + port)
    })
    it('.port-connect', async () => {
      const r = await cli.send('.port-list')
      assert.equal(r.blockchain, port.toString())
    })
    it('stop --all', async () => {
      await cli.send('.port tcp://127.0.0.1:3000')
      await cli.send('stop --all')
    })
    it('version', async () => {
      const r = await cli.send('version')
      assert.equal(r, 'FlockManager')
    })
  })
})
