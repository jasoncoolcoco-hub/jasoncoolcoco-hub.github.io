import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [
  accessibilityControl,
  page,
  styles,
  controller,
  manager,
  context,
  globalControl,
  home,
  portal,
  scene,
  speakerInteraction,
  macbookFocus,
] = await Promise.all([
  readFile(new URL('./StudioV2MusicAccessibilityControl.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./StudioV2ImportPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./studio-v2.css', import.meta.url), 'utf8'),
  readFile(new URL('./studioV2AudioController.js', import.meta.url), 'utf8'),
  readFile(new URL('./backgroundMusicManager.js', import.meta.url), 'utf8'),
  readFile(new URL('./BackgroundMusicContext.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./GlobalBackgroundMusicControl.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../components/HomeTransitionShell.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./macbook-site/MacbookSitePortal.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./createStudioV2Scene.js', import.meta.url), 'utf8'),
  readFile(new URL('./createStudioV2SpeakerMusicInteraction.js', import.meta.url), 'utf8'),
  readFile(new URL('./studioV2MacbookFocus.js', import.meta.url), 'utf8'),
])

assert.doesNotMatch(page, /StudioV2MusicControl/)
assert.match(page, /createBackgroundMusicManager\(controller\)/)
assert.match(page, /<StudioV2MusicAccessibilityControl manager=\{backgroundMusicManager\} \/>/)
assert.match(page, /backgroundMusicManager=\{backgroundMusicManager\}/)
assert.match(accessibilityControl, /studio-v2__music-accessibility-control/)
assert.match(accessibilityControl, /aria-label=\{label\}/)
assert.match(accessibilityControl, /aria-pressed=\{playingOrRequested\}/)
assert.match(accessibilityControl, /source: 'accessible-control'/)
assert.match(accessibilityControl, /manager\?\.toggleByUser/)
assert.match(styles, /\.studio-v2__music-accessibility-control \{[\s\S]*clip-path: inset\(50%\);/)
assert.doesNotMatch(styles, /\.studio-v2__music-control/)
assert.doesNotMatch(styles, /\.studio-v2__music-capsule/)
assert.doesNotMatch(styles, /studio-v2-music-bar/)

assert.match(speakerInteraction, /id: 'STANMORE_SPEAKER_01'/)
assert.match(speakerInteraction, /intersectObject\(speakerRoot, true\)/)
assert.match(speakerInteraction, /playMs: 1200/)
assert.match(speakerInteraction, /pauseMs: 850/)
assert.match(speakerInteraction, /event\.stopImmediatePropagation\(\)/)
assert.match(speakerInteraction, /backgroundMusicManager\.toggleByUser/)
assert.match(scene, /getObjectByName\(STUDIO_V2_SCENE_EXPANSION_IDS\.speaker\)/)
assert.match(scene, /isPriorityTarget: \(event\) => speakerMusicInteraction\?\.hit\(event\) \?\? false/)
assert.match(macbookFocus, /if \(isPriorityTarget\(event\)\)/)

assert.match(controller, /function fadePause\(/)
assert.match(controller, /const startVolume = audio\.volume/)
assert.match(controller, /rampOwnerCount: 1/)
assert.match(manager, /PLAYING: 'PLAYING'/)
assert.match(manager, /PAUSED_BY_USER: 'PAUSED_BY_USER'/)
assert.match(manager, /SUSPENDED_BY_CONTENT: 'SUSPENDED_BY_CONTENT'/)
assert.match(manager, /function suspendForContent/)
assert.match(context, /useBackgroundMusicSuspension/)
assert.match(globalControl, /macbook-site-portal__music/)
assert.match(globalControl, /manager\?\.toggleByUser/)
assert.match(portal, /<BackgroundMusicProvider manager=\{backgroundMusicManager\}>/)
assert.match(portal, /<GlobalBackgroundMusicControl active=\{siteActive\} \/>/)
assert.match(portal, /backgroundMusicManager\?\.suspendForContent\?\.\(\{[\s\S]*?source: 'macbook-site-opening'/)
assert.match(home, /source: 'footprints-exit'/)
assert.match(home, /movingDown/)
assert.match(home, /footprintsExitThreshold/)
assert.doesNotMatch(scene, /source: 'macbook-site-opening'/)
assert.doesNotMatch(scene, /audioController\?\.fadePause\?\.\([\s\S]{0,120}OPENING/)
assert.doesNotMatch(controller, /addEventListener\?\.\('click', handleFirstGesture/)
assert.doesNotMatch(controller, /addEventListener\?\.\('touchend', handleFirstGesture/)
assert.doesNotMatch(controller, /addEventListener\?\.\('keydown', handleFirstGesture/)

console.log('Studio V2 global background music control tests passed.')
