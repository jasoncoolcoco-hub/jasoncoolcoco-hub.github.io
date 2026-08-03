import * as THREE from 'three'
import { studioLightingConfig } from '../config/studioConfig'

export function createStudioLighting() {
  const group = new THREE.Group()
  group.name = 'StudioLighting'

  const hemisphere = new THREE.HemisphereLight(
    studioLightingConfig.hemisphere.sky,
    studioLightingConfig.hemisphere.ground,
    studioLightingConfig.hemisphere.intensity,
  )
  group.add(hemisphere)

  const key = new THREE.DirectionalLight(
    studioLightingConfig.warmKey.color,
    studioLightingConfig.warmKey.intensity,
  )
  key.position.set(...studioLightingConfig.warmKey.position)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -24
  key.shadow.camera.right = 24
  key.shadow.camera.top = 22
  key.shadow.camera.bottom = -16
  key.shadow.camera.near = 2
  key.shadow.camera.far = 55
  key.shadow.bias = -0.00025
  group.add(key)

  const wallFill = new THREE.PointLight(
    studioLightingConfig.wallFill.color,
    studioLightingConfig.wallFill.intensity,
    studioLightingConfig.wallFill.distance,
    1.6,
  )
  wallFill.position.set(...studioLightingConfig.wallFill.position)
  group.add(wallFill)

  const coolFill = new THREE.PointLight(
    studioLightingConfig.coolFacade.color,
    studioLightingConfig.coolFacade.intensity,
    studioLightingConfig.coolFacade.distance,
    1.7,
  )
  coolFill.position.set(...studioLightingConfig.coolFacade.position)
  group.add(coolFill)

  const ceilingFill = new THREE.PointLight(
    studioLightingConfig.ceilingFill.color,
    studioLightingConfig.ceilingFill.intensity,
    studioLightingConfig.ceilingFill.distance,
    1.7,
  )
  ceilingFill.position.set(...studioLightingConfig.ceilingFill.position)
  group.add(ceilingFill)

  return group
}
