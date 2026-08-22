import assert from 'node:assert/strict'
import {
  BACKGROUND_MUSIC_STATES,
  createBackgroundMusicManager,
} from './backgroundMusicManager.js'

class FakeAudioController {
  constructor() {
    this.fadePauseCalls = []
    this.listeners = new Set()
    this.playCalls = []
    this.state = {
      status: 'paused',
      paused: true,
      currentTime: 0,
      activeVolumeRamp: false,
      errorCode: null,
    }
  }

  getState() {
    return { ...this.state }
  }

  publish(patch) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener(this.getState()))
    return this.getState()
  }

  subscribe(listener) {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  async play(options) {
    this.playCalls.push(options)
    return this.publish({ status: 'playing', paused: false, activeVolumeRamp: true })
  }

  async fadePause(options) {
    this.fadePauseCalls.push(options)
    return this.publish({ status: 'paused', paused: true, activeVolumeRamp: false })
  }
}

const audioController = new FakeAudioController()
const manager = createBackgroundMusicManager(audioController)

assert.equal(manager.getState().status, BACKGROUND_MUSIC_STATES.PAUSED_BY_USER)
await manager.resumeByUser({ source: 'marshall-speaker' })
assert.equal(manager.getState().status, BACKGROUND_MUSIC_STATES.PLAYING)
assert.equal(audioController.playCalls.length, 1)

await manager.suspendForContent({ source: 'macbook-site-opening' })
assert.equal(manager.getState().status, BACKGROUND_MUSIC_STATES.SUSPENDED_BY_CONTENT)
assert.equal(manager.getState().contentSource, 'macbook-site-opening')
assert.equal(audioController.fadePauseCalls.length, 1)

// Closing the website does not issue a resume request. Only an explicit user
// action through Marshall or an accessibility control may resume playback.
assert.equal(audioController.playCalls.length, 1)
await manager.resumeByUser({ source: 'marshall-speaker' })
assert.equal(manager.getState().status, BACKGROUND_MUSIC_STATES.PLAYING)
assert.equal(audioController.playCalls.length, 2)

await manager.suspendForContent({ source: 'footprints-exit' })
assert.equal(manager.getState().status, BACKGROUND_MUSIC_STATES.SUSPENDED_BY_CONTENT)
assert.equal(manager.getState().contentSource, 'footprints-exit')
assert.equal(audioController.fadePauseCalls.length, 2)

await manager.resumeByUser({ source: 'website-global-control' })
assert.equal(manager.getState().status, BACKGROUND_MUSIC_STATES.PLAYING)
assert.equal(manager.getState().contentSource, null)

await manager.pauseByUser({ source: 'website-global-control' })
assert.equal(manager.getState().status, BACKGROUND_MUSIC_STATES.PAUSED_BY_USER)
assert.equal(manager.getState().lastUserIntent, 'PAUSED')
const fadePauseCountAfterManualPause = audioController.fadePauseCalls.length

await manager.suspendForContent({ source: 'future-video' })
assert.equal(manager.getState().status, BACKGROUND_MUSIC_STATES.PAUSED_BY_USER)
assert.equal(audioController.fadePauseCalls.length, fadePauseCountAfterManualPause)

manager.destroy()
console.log('Global background music state manager tests passed.')
