import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [component, page, styles, controller] = await Promise.all([
  readFile(new URL('./StudioV2MusicControl.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./StudioV2ImportPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./studio-v2.css', import.meta.url), 'utf8'),
  readFile(new URL('./studioV2AudioController.js', import.meta.url), 'utf8'),
])

assert.match(page, /<StudioV2MusicControl audioController=\{audioController\} \/>/)
assert.match(component, /PLAY MUSIC/)
assert.match(component, /NOW PLAYING/)
assert.match(component, /MUSIC PAUSED/)
assert.match(component, /await audioController\.toggle\(\)/)
assert.match(component, /onPointerDown=\{stopSceneEvent\}/)
assert.match(component, /onClick=\{stopSceneEvent\}/)
assert.match(component, /aria-pressed=\{playing\}/)
assert.match(styles, /\.studio-v2__music-control \{[\s\S]*position: fixed;/)
assert.match(styles, /\.studio-v2__music-capsule \{[\s\S]*min-height: 42px;/)
assert.match(styles, /touch-action: manipulation;/)
assert.match(styles, /@media \(max-width: 700px\)/)
assert.doesNotMatch(controller, /addEventListener\?\.\('click', handleFirstGesture/)
assert.doesNotMatch(controller, /addEventListener\?\.\('touchend', handleFirstGesture/)
assert.doesNotMatch(controller, /addEventListener\?\.\('keydown', handleFirstGesture/)

console.log('Studio V2 music control tests passed.')
