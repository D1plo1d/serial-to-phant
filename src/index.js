const Phant = require('phant-client').Phant
const SerialPort = require('serialport')
const koa = require('koa')
const route = require('koa-route')
const websockify = require('koa-websocket')
const serve = require('koa-static')

const dryRun = false

class SerialToPhant {

  constructor(opts) {
    const settingKeys = ['port', 'phant', 'iri']
    settingKeys.forEach((k) => {
      if (opts[k] == null) throw k + ' is not defined'
      this[k] = opts[k]
    })

    this.streamd = null
  }

  connect() {
    console.log('Connecting...')

    // Arduino
    this.port.on('open', this.onPortOpen.bind(this))
    this.port.on('error', this.onError('SERIAL').bind(this))
    this.port.on('data', this.onSerialData.bind(this))

    // Phant
    this.phant.connect(this.iri, this.onPhantConnect.bind(this))

    // Local Websocket + Frontend
    this.app = websockify(koa())

    this.app.use(serve(__dirname + "/static/"))

    var self = this
    this.app.ws.use(route.all('/stream', function* (next) {
      // yielding `next` will pass the context (this) on to the next ws middleware
      yield next
    }))

    this.app.listen(4321)
  }

  isConnectedToPhant() {
    return this.streamd != null
  }

  onPortOpen() {
    console.log("Connected to Arduino")
  }

  onPhantConnect(error, streamd) {
    if (error) this.onError('PHANT')(error)
    console.log('Connected to Phant')
    this.streamd = streamd
  }

  onSerialData(data) {
    // console.log('SERIAL RAW DATA RECEIVED:', data)
    data = JSON.parse(data)
    console.log('SERIAL DATA RECEIVED:', data)
    if (this.isConnectedToPhant()) {
      this.phant.add(this.streamd, data)
    }
    this.app.ws.server.clients.forEach((client) => client.send(JSON.stringify(data)))
  }

  onError(type) {
    return (err) => {
      console.log(type + ' ERROR:', err.message)
      process.exit()
    }
  }
}

var secrets = require('../secrets.json')

var connectTo = (portInfo) => {
  var comName = portInfo.comName
  var port = new SerialPort(comName, {
    baudRate: secrets.serial.baudRate,
    parser: SerialPort.parsers.readline('\n')
  })
  var settings = {
    phant: new Phant(),
    iri: secrets.iri,
    port: port
  }
  new SerialToPhant(settings).connect()
}

if (dryRun) {
  console.log("DRY RUN    DRY RUN    DRY RUN    DRY RUN    DRY RUN    DRY RUN\n")
  new SerialToPhant({
    phant: new Phant(),
    iri: secrets.iri,
    port: {
      on(e, fn) {}
    }
  }).connect()
}
else if (secrets.ports == null) {
  SerialPort.list((err, ports) => {
    var portInfo = ports.filter((p) => (p.manufacturer||'').startsWith('Arduino'))[0]
    if (portInfo == null) {
      throw 'No serial ports detected. Please plug in Adrunio'
    }
    console.log('Ardunio detected. Connecting to ' + portInfo.comName)
    connectTo(portInfo)
  });
}
else {
  connectTo({comName: secrets.serial.port})
}
