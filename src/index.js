var Phant = require('phant-client').Phant
var SerialPort = require('serialport')

class SerialToPhant {

  constructor(opts) {
    this.streamd = null
    var settingKeys = ['port', 'phant', 'iri']
    settingKeys.forEach((k) => {
      if (opts[k] == null) throw k + ' is not defined'
      this[k] = opts[k]
    })
  }

  connect() {
    console.log('Connecting...')
    this.port.on('open', this.onPortOpen.bind(this))
    this.port.on('error', this.onError('SERIAL').bind(this))
    this.port.on('data', this.onSerialData.bind(this))
  }

  isConnectedToPhant() {
    return this.streamd != null
  }

  onPortOpen() {
    console.log("Connected to Arduino")
    this.phant.connect(this.iri, this.onPhantConnect.bind(this))
  }

  onPhantConnect(error, streamd) {
    if (error) onError('PHANT')(error)
    console.log('Connected to Phant')
    this.streamd = streamd
  }

  onSerialData(data) {
    if (!this.isConnectedToPhant()) return
    // console.log('SERIAL RAW DATA RECEIVED:', data)
    data = JSON.parse(data)
    console.log('SERIAL DATA RECEIVED:', data)
    this.phant.add(this.streamd, data)
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

if (secrets.ports == null) {
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
