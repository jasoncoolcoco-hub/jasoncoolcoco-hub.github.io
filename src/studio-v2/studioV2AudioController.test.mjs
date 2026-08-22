import assert from 'node:assert/strict'
import { createStudioV2AudioController } from './studioV2AudioController.js'
import { resolveStudioV2AudioCatalogueForMode } from './studioV2AudioCatalogue.js'

globalThis.requestAnimationFrame ??= (callback) => setTimeout(() => callback(performance.now() + 5000), 0)
globalThis.cancelAnimationFrame ??= clearTimeout

class FakeGestureTarget {
  constructor() {
    this.listeners = new Map()
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
    this.listeners.get(name)?.forEach((listener) => listener({ type: name }))
  }
}

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
const deferredEntryGestures = new FakeGestureTarget()
const deferredEntryController = createStudioV2AudioController({
  createAudioElement: () => {
    deferredEntryAudio = new FakeAudio()
    return deferredEntryAudio
  },
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
  gestureTarget: deferredEntryGestures,
})
await deferredEntryController.prepareEntry()
assert.equal(deferredEntryAudio.preload, 'none')
assert.equal(deferredEntryAudio.loadCalls, 0)
assert.equal(deferredEntryController.getState().entryStatus, 'control-ready')
deferredEntryController.startEntryExperience()
assert.equal(deferredEntryAudio.preload, 'none')
assert.equal(deferredEntryAudio.playCalls, 0)
assert.equal(deferredEntryController.getState().fallbackArmed, false)
assert.equal(deferredEntryGestures.listeners.size, 0)
deferredEntryGestures.emit('click')
deferredEntryGestures.emit('touchend')
deferredEntryGestures.emit('keydown')
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(deferredEntryAudio.playCalls, 0)
assert.equal(deferredEntryController.getState().status, 'track-loading')
await deferredEntryController.toggle()
assert.equal(deferredEntryAudio.playCalls, 1)
assert.equal(deferredEntryController.getState().status, 'playing')
assert.equal(deferredEntryController.getState().entryStatus, 'playing-by-control')
assert.equal(deferredEntryController.getState().fallbackArmed, false)
deferredEntryAudio.currentTime = 12
await deferredEntryController.toggle()
assert.equal(deferredEntryAudio.playCalls, 1)
assert.equal(deferredEntryController.getState().status, 'paused')
assert.equal(deferredEntryAudio.currentTime, 12)
await deferredEntryController.toggle()
assert.equal(deferredEntryAudio.playCalls, 2)
assert.equal(deferredEntryController.getState().status, 'playing')
assert.equal(deferredEntryAudio.currentTime, 12)
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
assert.equal(rejectedPlayback.getState().status, 'paused')
assert.match(rejectedPlayback.getState().error, /rejected/)
await rejectedPlayback.loadCatalogue({ force: true })
assert.equal(rejectedPlayback.getState().status, 'idle')
assert.equal(rejectedPlayback.getState().trackId, null)
assert.equal(rejectedPlayback.getState().error, null)
rejectedPlayback.destroy()

class RetryAudio extends FakeAudio {
  play() {
    this.playCalls += 1
    if (this.playCalls === 1) {
      this.paused = true
      return Promise.reject(new Error('Transient play rejection.'))
    }
    this.paused = false
    this.emit('playing')
    return Promise.resolve()
  }
}

let retryAudio = null
const retryController = createStudioV2AudioController({
  createAudioElement: () => {
    retryAudio = new RetryAudio()
    return retryAudio
  },
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
})
await retryController.prepareEntry()
await retryController.toggle()
assert.equal(retryController.getState().status, 'paused')
assert.equal(retryController.getState().errorCode, 'AUDIO_PLAYBACK_FAILED')
await retryController.toggle()
assert.equal(retryController.getState().status, 'playing')
assert.equal(retryController.getState().errorCode, null)
assert.equal(retryAudio.playCalls, 2)
retryController.destroy()

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

let pendingToggleAudio = null
const pendingToggleController = createStudioV2AudioController({
  createAudioElement: () => {
    pendingToggleAudio = new DeferredAudio()
    return pendingToggleAudio
  },
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
})
await pendingToggleController.loadCatalogue()
const pendingPlay = pendingToggleController.toggle()
await pendingToggleController.toggle()
await pendingPlay
assert.equal(pendingToggleAudio.playCalls, 0)
assert.equal(pendingToggleAudio.paused, true)
assert.equal(pendingToggleController.getState().rampOwnerCount, 0)
const confirmedPlay = pendingToggleController.toggle()
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(pendingToggleAudio.playCalls, 1)
pendingToggleAudio.resolvePlay()
await confirmedPlay
assert.equal(pendingToggleController.getState().status, 'playing')
pendingToggleController.destroy()

const originalRequestAnimationFrame = globalThis.requestAnimationFrame
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
const rampFrames = new Map()
let nextRampFrameId = 1
globalThis.requestAnimationFrame = (callback) => {
  const id = nextRampFrameId
  nextRampFrameId += 1
  rampFrames.set(id, callback)
  return id
}
globalThis.cancelAnimationFrame = (id) => rampFrames.delete(id)
const advanceRamp = (milliseconds) => {
  const frameTime = performance.now() + milliseconds
  const callbacks = [...rampFrames.values()]
  rampFrames.clear()
  callbacks.forEach((callback) => callback(frameTime))
}

let rapidAudio = null
const rapidController = createStudioV2AudioController({
  createAudioElement: () => {
    rapidAudio = new FakeAudio()
    return rapidAudio
  },
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
})
await rapidController.prepareEntry()
assert.equal(rapidAudio.playCalls, 0)
await rapidController.toggle({ fadeInMs: 1200, fadeOutMs: 850, source: 'marshall-speaker' })
assert.equal(rapidController.getState().status, 'playing')
assert.equal(rapidController.getState().rampOwnerCount, 1)
assert.equal(rapidController.getState().rampSource, 'marshall-speaker')
advanceRamp(600)
const fadeInVolume = rapidAudio.volume
assert.ok(fadeInVolume > 0 && fadeInVolume < 0.1)
rapidAudio.currentTime = 42

const fadeOut = rapidController.toggle({
  fadeInMs: 1200,
  fadeOutMs: 850,
  source: 'marshall-speaker',
})
assert.equal(rapidController.getState().status, 'fading-out')
assert.equal(rapidController.getState().rampOwnerCount, 1)
assert.equal(rapidAudio.paused, false)
advanceRamp(425)
const fadeOutVolume = rapidAudio.volume
assert.ok(fadeOutVolume > 0 && fadeOutVolume < fadeInVolume)

await rapidController.toggle({ fadeInMs: 1200, fadeOutMs: 850, source: 'marshall-speaker' })
await fadeOut
assert.equal(rapidAudio.volume, fadeOutVolume)
assert.equal(rapidAudio.currentTime, 42)
assert.equal(rapidAudio.playCalls, 1)
assert.equal(rapidController.getState().rampOwnerCount, 1)
advanceRamp(1200)
assert.equal(rapidAudio.volume, 0.1)
assert.equal(rapidController.getState().rampOwnerCount, 0)

const completedPause = rapidController.fadePause({
  durationMs: 1050,
  source: 'macbook-site-opening',
})
assert.equal(rapidAudio.paused, false)
advanceRamp(1050)
await completedPause
assert.equal(rapidAudio.paused, true)
assert.equal(rapidAudio.currentTime, 42)
assert.equal(rapidController.getState().entryStatus, 'paused-by-macbook-site')
assert.equal(rapidController.getState().rampOwnerCount, 0)

await rapidController.toggle({ fadeInMs: 1200, fadeOutMs: 850, source: 'marshall-speaker' })
assert.equal(rapidAudio.playCalls, 2)
assert.equal(rapidAudio.currentTime, 42)
advanceRamp(1200)
assert.equal(rapidController.getState().status, 'playing')
assert.equal(rapidController.getState().audioElementCount, 1)
rapidController.destroy()

let tailAudio = null
const tailController = createStudioV2AudioController({
  createAudioElement: () => {
    tailAudio = new FakeAudio()
    return tailAudio
  },
  fetchImpl: async () => ({ ok: true, json: async () => catalogue }),
})
await tailController.prepareEntry()
await tailController.play({ durationMs: 0, source: 'tail-test' })
assert.equal(tailAudio.volume, 0.1)

tailAudio.currentTime = 169.9
tailAudio.emit('timeupdate')
assert.equal(tailController.getState().tailFadeStarted, false)
assert.equal(tailController.getState().rampSource, null)

tailAudio.currentTime = 170
tailAudio.emit('timeupdate')
assert.equal(tailController.getState().tailFadeStarted, true)
assert.equal(tailController.getState().tailFadeActive, true)
assert.equal(tailController.getState().tailFadeStartedAtMediaTime, 170)
assert.equal(tailController.getState().rampSource, 'track-tail-fade')
assert.equal(tailController.getState().rampOwnerCount, 1)

advanceRamp(4800)
const midTailVolume = tailAudio.volume
assert.ok(midTailVolume > 0 && midTailVolume < 0.1)
tailAudio.currentTime = 174
tailAudio.emit('timeupdate')
assert.equal(tailController.getState().tailFadeStartedAtMediaTime, 170)
assert.equal(tailController.getState().rampSource, 'track-tail-fade')

advanceRamp(7990)
tailAudio.currentTime = 177.99
tailAudio.emit('timeupdate')
assert.equal(tailController.getState().tailSilenceLocked, false)
assert.ok(tailAudio.volume >= 0 && tailAudio.volume < 0.001)

tailAudio.currentTime = 178
tailAudio.emit('timeupdate')
assert.equal(tailAudio.volume, 0)
assert.equal(tailController.getState().tailFadeActive, false)
assert.equal(tailController.getState().tailSilenceLocked, true)
assert.equal(tailController.getState().rampOwnerCount, 0)
assert.equal(tailController.getState().rampSource, null)

const silentTailPause = tailController.fadePause({ durationMs: 400, source: 'tail-test' })
await silentTailPause
assert.equal(tailAudio.paused, true)
assert.equal(tailAudio.currentTime, 178)
assert.equal(tailAudio.volume, 0)
await tailController.play({ durationMs: 1200, source: 'tail-test' })
assert.equal(tailAudio.currentTime, 178)
assert.equal(tailAudio.volume, 0)
assert.equal(tailController.getState().tailSilenceLocked, true)
assert.equal(tailController.getState().rampOwnerCount, 0)
assert.equal(tailController.getState().rampSource, null)

tailController.stop()
await tailController.play({ durationMs: 0, source: 'tail-test' })
tailAudio.currentTime = 170
tailAudio.emit('timeupdate')
advanceRamp(3000)
const volumeBeforeTailPause = tailAudio.volume
assert.ok(volumeBeforeTailPause > 0 && volumeBeforeTailPause < 0.1)
tailAudio.currentTime = 173
tailAudio.emit('timeupdate')
const tailPause = tailController.fadePause({ durationMs: 400, source: 'tail-test' })
assert.equal(tailController.getState().tailFadeActive, false)
assert.equal(tailController.getState().rampSource, 'tail-test')
advanceRamp(400)
await tailPause
assert.equal(tailAudio.paused, true)
assert.equal(tailAudio.currentTime, 173)
assert.equal(tailAudio.volume, 0)

await tailController.play({ durationMs: 1200, source: 'tail-test' })
assert.equal(tailAudio.currentTime, 173)
assert.equal(tailAudio.volume, 0)
assert.equal(tailController.getState().rampSource, 'track-tail-resume')
assert.ok(tailController.getState().rampTargetVolume > 0)
assert.ok(tailController.getState().rampTargetVolume <= volumeBeforeTailPause)
advanceRamp(300)
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(tailController.getState().rampSource, 'track-tail-fade')
assert.ok(tailAudio.volume > 0 && tailAudio.volume <= volumeBeforeTailPause)
advanceRamp(5000)
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(tailAudio.volume, 0)
assert.equal(tailController.getState().rampOwnerCount, 0)
assert.equal(tailController.getState().tailSilenceLocked, true)

await tailController.setTrack('second-track')
await tailController.play({ durationMs: 0, source: 'tail-test' })
assert.equal(tailAudio.loop, true)
tailAudio.currentTime = 170
tailAudio.emit('timeupdate')
assert.equal(tailAudio.loop, false)
assert.equal(tailController.getState().loop, false)
const playCallsBeforeEnd = tailAudio.playCalls
tailAudio.emit('ended')
assert.equal(tailController.getState().status, 'ready')
assert.equal(tailAudio.volume, 0)
assert.equal(tailAudio.playCalls, playCallsBeforeEnd)
tailController.destroy()
globalThis.requestAnimationFrame = originalRequestAnimationFrame
globalThis.cancelAnimationFrame = originalCancelAnimationFrame

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
