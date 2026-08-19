import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const [configSource, materialSource, pageSource, sceneSource] = await Promise.all([
  readFile(new URL('./studioV2Config.js', import.meta.url), 'utf8'),
  readFile(new URL('./studioV2MaterialTuning.js', import.meta.url), 'utf8'),
  readFile(new URL('./StudioV2ImportPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./createStudioV2Scene.js', import.meta.url), 'utf8'),
])

assert.match(configSource, /STUDIO_V2_EXTERIOR_DAYLIGHT/)
assert.match(configSource, /emissiveIntensity: 0\.64/)
assert.match(configSource, /color: '#f3f7ff'/)
assert.match(configSource, /windowFillIntensity: 0\.46/)
assert.match(materialSource, /tuneStudioV2ExteriorDaylight/)
assert.match(materialSource, /candidate\.object\.castShadow = false/)
assert.match(materialSource, /candidate\.object\.receiveShadow = false/)
assert.match(sceneSource, /const windowFill = new THREE\.RectAreaLight/)
assert.equal(sceneSource.match(/const \w+Light = new THREE\.DirectionalLight\(/g)?.length, 2)
assert.doesNotMatch(sceneSource, /windowFill\.castShadow = true/)
assert.doesNotMatch(pageSource, /Filmic|filmic|Cinematic/)
assert.doesNotMatch(sceneSource, /cinematicTreatment|FilmicShouldSuppress|initialFilmicEnabled/)

await Promise.all([
  access(new URL('./StudioV2FilmicToggle.jsx', import.meta.url)).then(
    () => assert.fail('Temporary Filmic review UI still exists'),
    () => undefined,
  ),
  access(new URL('./studioV2CinematicTreatment.js', import.meta.url)).then(
    () => assert.fail('Rejected cinematic treatment still exists'),
    () => undefined,
  ),
])

console.log('Studio V2 exterior daylight smoke test passed')
