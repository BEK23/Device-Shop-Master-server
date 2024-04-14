const path = require('node:path')
const jsonServer = require('json-server')
const bodyParser = require('body-parser')
const multer = require('multer')
// const chokidar = require('chokidar')

const server = jsonServer.create()
const router = jsonServer.router(path.join(__dirname, 'db.json'))

// Watch for changes in db.json file
// const watcher = chokidar.watch(path.join(__dirname, 'db.json'))

// watcher.on('change', () => {
//   console.log('db.json has changed. Reloading routes...')
//   router.db.read()
//   router.db.setState(router.db.getState())
// })

// Rest of the code...
const middlewares = jsonServer.defaults()

server.use(middlewares)
server.use(bodyParser.json())

server.get('/devices', (req, res) => {
  const devices = router.db.get('devices').value()
  const category = Number.parseInt(req.query.category)
  const search = req.query.search
  const sort = req.query.sort
  const order = req.query.order ?? 'ascending'

  let filteredDevices = devices

  if (category)
    filteredDevices = filteredDevices.filter(device => device.category === category)

  if (search)
    filteredDevices = filteredDevices.filter(device => device.model.toLowerCase().includes(search.toLowerCase()))

  if (sort) {
    filteredDevices = filteredDevices.sort((a, b) => {
      if (order === 'ascending')
        return a[sort] > b[sort] ? 1 : -1
      else
        return a[sort] < b[sort] ? 1 : -1
    })
  }

  const page = Number.parseInt(req.query.page) || 1
  const limit = Number.parseInt(req.query.limit) || 10
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  const paginatedDevices = filteredDevices.slice(startIndex, endIndex)

  const response = {
    data: paginatedDevices,
    meta: {
      length: paginatedDevices.length,
      total: filteredDevices.length,
      totalPages: Math.ceil(filteredDevices.length / limit),
      currentPage: page,
    },
  }

  res.json(response)
})

const upload = multer({ dest: 'server/uploads/' })

server.post('/devices', upload.single('photo'), (req, res) => {
  const devices = router.db.get('devices').value()

  const { category, recommendedPrice, visible, ...rest } = req.body

  const newDevice = {
    ...rest,
    id: devices.length + 1,
    createdAt: new Date().getTime(),
    category: Number.parseInt(category),
    createdAt: new Date().getTime(),
    recommendedPrice: Number.parseFloat(recommendedPrice),
    visible: visible === 'true',
    photo: req.file?.originalname,
  }

  devices.unshift(newDevice)
  router.db.set('devices', devices).write()
  res.status(201).json(newDevice)
})

server.put('/devices/:id', upload.single('photo'), (req, res) => {
  const devices = router.db.get('devices').value()
  const deviceId = Number.parseInt(req.params.id)

  const { id, photo, createdAt, category, recommendedPrice, visible, ...rest } = req.body

  const updatedDeviceIndex = devices.findIndex(device => device.id === deviceId)
  if (updatedDeviceIndex === -1) {
    res.status(404).json({ error: 'Device not found' })
    return
  }

  const updatedDevice = {
    ...rest,
    id: Number.parseInt(id),
    category: Number.parseInt(category),
    recommendedPrice: Number.parseFloat(recommendedPrice),
    createdAt: Number.parseInt(createdAt),
    visible: visible === 'true',
    photo: req.file?.originalname ?? photo,
  }
  devices[updatedDeviceIndex] = updatedDevice
  router.db.set('devices', devices).write()
  res.json(updatedDevice)
})

server.use(router)
server.listen(8080, () => {
  console.log('JSON Server is running')
})
