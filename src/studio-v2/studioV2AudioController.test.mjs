import assert from 'node:assert/strict'
import { createStudioV2AudioController } from './studioV2AudioController.js'
import { resolveStudioV2AudioCatalogueForMode } from './studioV2AudioCatalogue.js'

class FakeAudio {
  constructor() {
    FakeAudio.instances += 1
    this.autoplay = true
    this.currentTime = 0
    this.duration = 180
    this.error = null
    this.listeners = new Map()
    this.loadCalls = 0
    this.loop = false
    this.paused = true
    this.preload = 'auto'
    this.src = ''
    this.volume = 1
    this.playCalls = 0
  }

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) ?? new Set()
    listeners.add(listener)
    this.listeners.set(name, listeners)
  }

  removeEventListener(name, listener) {
    this.listeners.get(name)?.delete(listener)
  }

  emit(name) {
    this.listeners.get(name)?.forEach((listener) => listener())
  }

  load() {
    this.loadCalls += 1
    this.emit('loadedmetadata')
  }

  pause() {
    this.paused = true
    this.emit('pause')
  }

  play() {
    this.playCalls += 1
    this.paused = false
    this.emit('playing')
    return Promise.resolve()
  }

  removeAttribute(name) {
    if (name === 'src') this.src = ''
  }
}

FakeAudio.instances = 0

assert.deepEqual(
  resolveStudioV2AudioCatalogueForMode(false),
  {
    mode: 'development',
    url: '/audio/fred-studio/catalog.local.json',
  },
)
assert.deepEqual(
  resolveStudioV2AudioCatalogueForMode(true),
  {
    mode: 'production',
    url: '/audio/fred-studio/catalog.published.json',
  },
)

const catalogue = {
  version: 1,
  defaultTrackId: 'default-track',
  tracks: [
    {
      id: 'default-track',
      title: 'Default',
      version: 'Test',
      artist: 'Example',
      file: '/default.m4a',
      cover: null,
      enabled: true,
      loop: false,
      volume: 0.8,
    },
    {
      id: 'second-track',
      title: 'Second',
      version: 'Test',
      artist: 'Example',
      file: '/second.m4a',
      cover: null,
      enabled: true,
      loop: true,
      volume: 0.6,
    },
    {
      id: 'disabled-track',
      title: 'Disabled',
      version: 'Test',
      artist: 'Example',
      file: '/disabled.m4a',
      cover: null,
      enabled: false,
      loop: false,
      volume: 0.5,
    },
  ],
}

let deferredEntryAudio
const deferredEntryController = createStudioV2AudioController({
  createAudioElement: () => {
    deferredEntryAudio = new FakeAudio()
    return deferredEntryAudio
  },
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
})
await deferredEntryController.prepareEntry()
assert.equal(deferredEntryAudio.preload, 'none')
assert.equal(deferredEntryAudio.loadCalls, 0)
assert.equal(deferredEntryController.getState().entryStatus, 'prepared')
await deferredEntryController.startEntryExperience()
assert.equal(deferredEntryAudio.preload, 'auto')
assert.equal(deferredEntryAudio.playCalls, 1)
deferredEntryController.destroy()
FakeAudio.instances = 0

const controller = createStudioV2AudioController({
  createAudioElement: () => new FakeAudio(),
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
})

assert.equal(FakeAudio.instances, 1)
assert.equal(controller.getState().audioElementCount, 1)
await controller.loadCatalogue()
assert.equal(controller.getState().catalogueStatus, 'ready')
assert.equal(controller.getState().defaultTrackId, 'default-track')
assert.equal(controller.getState().tracks[0].version, 'Test')
await controller.play()
assert.equal(controller.getState().trackId, 'default-track')
assert.equal(controller.getState().status, 'playing')
controller.pause()
assert.equal(controller.getState().status, 'paused')
await controller.play()
assert.equal(controller.getState().status, 'playing')
await controller.setTrack('second-track')
assert.equal(controller.getState().trackId, 'second-track')
assert.equal(controller.getState().loop, true)
await controller.setTrack('disabled-track')
assert.equal(controller.getState().status, 'error')
assert.match(controller.getState().error, /disabled/)
await controller.previous()
assert.equal(controller.getState().trackId, 'default-track')
await controller.next()
assert.equal(controller.getState().trackId, 'second-track')
assert.equal(FakeAudio.instances, 1)
controller.stop()
assert.equal(controller.getState().currentTime, 0)
controller.destroy()

const fixtureController = createStudioV2AudioController({
  createAudioElement: () => new FakeAudio(),
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
})
await fixtureController.loadCatalogue()
fixtureController.setDebugCatalogueFixture(6)
assert.equal(fixtureController.getState().tracks.length, 6)
assert.equal(fixtureController.getState().debugFixtureCount, 6)
await fixtureController.setTrack('debug-fixture-2')
await fixtureController.play()
assert.equal(fixtureController.getState().trackId, 'debug-fixture-2')
assert.equal(fixtureController.getState().status, 'playing')
assert.equal(FakeAudio.instances, 2)
fixtureController.destroy()

const emptyPublishedController = createStudioV2AudioController({
  catalogueUrl: '/audio/fred-studio/catalog.published.json',
  createAudioElement: () => new FakeAudio(),
  fetchImpl: async () => ({
    ok: true,
    json: async () => ({ version: 1, defaultTrackId: null, tracks: [] }),
  }),
})
await emptyPublishedController.loadCatalogue()
assert.equal(emptyPublishedController.getState().catalogueStatus, 'empty')
assert.equal(emptyPublishedController.getState().status, 'unavailable')
assert.equal(emptyPublishedController.getState().errorCode, 'NO_PUBLISHED_TRACK')
await emptyPublishedController.toggle()
assert.equal(emptyPublishedController.getState().status, 'unavailable')
emptyPublishedController.destroy()

async function controllerForCatalogue(value, AudioClass = FakeAudio) {
  const instance = createStudioV2AudioController({
    createAudioElement: () => new AudioClass(),
    fetchImpl: async () => ({ ok: true, json: async () => value }),
  })
  await instance.loadCatalogue()
  return instance
}

const missingDefault = await controllerForCatalogue({
  ...catalogue,
  defaultTrackId: 'missing-track',
})
assert.equal(missingDefault.getState().status, 'error')
assert.match(missingDefault.getState().error, /not found/)
missingDefault.destroy()

const disabledDefault = await controllerForCatalogue({
  ...catalogue,
  defaultTrackId: 'disabled-track',
})
assert.equal(disabledDefault.getState().status, 'error')
assert.match(disabledDefault.getState().error, /disabled/)
disabledDefault.destroy()

const invalidCatalogue = await controllerForCatalogue({ version: 1, defaultTrackId: 'broken' })
assert.equal(invalidCatalogue.getState().status, 'error')
assert.match(invalidCatalogue.getState().error, /tracks must be an array/)
invalidCatalogue.destroy()

const missingCatalogue = createStudioV2AudioController({
  createAudioElement: () => new FakeAudio(),
  fetchImpl: async () => ({ ok: false, status: 404 }),
})
await missingCatalogue.loadCatalogue()
assert.equal(missingCatalogue.getState().status, 'error')
assert.match(missingCatalogue.getState().error, /404/)
missingCatalogue.destroy()

const invalidJsonCatalogue = createStudioV2AudioController({
  createAudioElement: () => new FakeAudio(),
  fetchImpl: async () => ({
    ok: true,
    json: async () => { throw new SyntaxError('Unexpected token in JSON') },
  }),
})
await invalidJsonCatalogue.loadCatalogue()
assert.equal(invalidJsonCatalogue.getState().status, 'error')
assert.match(invalidJsonCatalogue.getState().error, /Unexpected token/)
invalidJsonCatalogue.destroy()

const timedOutCatalogue = createStudioV2AudioController({
  createAudioElement: () => new FakeAudio(),
  fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('Aborted')
      error.name = 'AbortError'
      reject(error)
    })
  }),
})
await timedOutCatalogue.loadCatalogue({ timeoutMs: 5 })
assert.equal(timedOutCatalogue.getState().catalogueStatus, 'error')
assert.equal(timedOutCatalogue.getState().errorCode, 'CATALOGUE_TIMEOUT')
timedOutCatalogue.destroy()

class RejectingAudio extends FakeAudio {
  play() {
    this.paused = true
    return Promise.reject(new Error('User activation was rejected.'))
  }
}

const rejectedPlayback = await controllerForCatalogue(catalogue, RejectingAudio)
await rejectedPlayback.play()
assert.equal(rejectedPlayback.getState().status, 'error')
assert.match(rejectedPlayback.getState().error, /rejected/)
await rejectedPlayback.loadCatalogue({ force: true })
assert.equal(rejectedPlayback.getState().status, 'idle')
assert.equal(rejectedPlayback.getState().trackId, null)
assert.equal(rejectedPlayback.getState().error, null)
rejectedPlayback.destroy()

class DeferredAudio extends FakeAudio {
  constructor() {
    super()
    this.playCalls = 0
    this.resolvePlay = null
  }

  play() {
    this.playCalls += 1
    this.paused = false
    return new Promise((resolve) => {
      this.resolvePlay = () => {
        this.emit('playing')
        resolve()
      }
    })
  }
}

let deferredAudio = null
const rapidController = createStudioV2AudioController({
  createAudioElement: () => {
    deferredAudio = new DeferredAudio()
    return deferredAudio
  },
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
})
await rapidController.loadCatalogue()
const firstToggle = rapidController.toggle()
const repeatedToggle = rapidController.toggle()
assert.equal(firstToggle, repeatedToggle)
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(deferredAudio.playCalls, 1)
deferredAudio.resolvePlay()
await firstToggle
assert.equal(rapidController.getState().status, 'playing')
deferredAudio.currentTime = 42
deferredAudio.duration = 42
deferredAudio.emit('ended')
assert.equal(rapidController.getState().status, 'ready')
rapidController.destroy()

let routeExitAudio = null
const routeExitController = createStudioV2AudioController({
  createAudioElement: () => {
    routeExitAudio = new DeferredAudio()
    return routeExitAudio
  },
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
})
await routeExitController.loadCatalogue()
const routeExitPlay = routeExitController.play()
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(routeExitAudio.playCalls, 1)
routeExitController.destroy()
routeExitAudio.resolvePlay()
await routeExitPlay

console.log('Studio V2 audio controller tests passed.')
