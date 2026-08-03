import * as THREE from 'three'
import { studioLightingConfig, studioRenderingConfig } from '../config/studioConfig'

export function createStudioLighting() {
  const group = new THREE.Group()
  group.name = 'StudioLighting'

  const ambient = new THREE.AmbientLight(
    studioLightingConfig.ambient.color,
    studioLightingConfig.ambient.intensity,
  )
  ambient.name = 'LowAmbientFill'
  group.add(ambient)

  const hemisphere = new THREE.HemisphereLight(
    studioLightingConfig.hemisphere.sky,
    studioLightingConfig.hemisphere.ground,
    studioLightingConfig.hemisphere.intensity,
  )
  hemisphere.name = 'ArchitecturalHemisphere'
  group.add(hemisphere)

  const key = new THREE.DirectionalLight(
    studioLightingConfig.warmKey.color,
    studioLightingConfig.warmKey.intensity,
  )
  key.name = 'SoftWarmKey'
  key.position.set(...studioLightingConfig.warmKey.position)
  key.target.position.set(...studioLightingConfig.warmKey.target)
  key.castShadow = true
  key.shadow.mapSize.set(studioRenderingConfig.shadowMapSize, studioRenderingConfig.shadowMapSize)
  key.shadow.camera.left = -40
  key.shadow.camera.right = 40
  key.shadow.camera.top = 38
  key.shadow.camera.bottom = -32
  key.shadow.camera.near = 2
  key.shadow.camera.far = 96
  key.shadow.bias = studioRenderingConfig.shadowBias
  key.shadow.normalBias = studioRenderingConfig.shadowNormalBias
  key.shadow.radius = 5
  key.shadow.blurSamples = 12
  group.add(key, key.target)

  const warmBounce = new THREE.RectAreaLight(
    studioLightingConfig.warmBounce.color,
    studioLightingConfig.warmBounce.intensity,
    studioLightingConfig.warmBounce.width,
    studioLightingConfig.warmBounce.height,
  )
  warmBounce.name = 'LargeWarmBounce'
  warmBounce.position.set(...studioLightingConfig.warmBounce.position)
  warmBounce.lookAt(new THREE.Vector3(...studioLightingConfig.warmBounce.target))
  group.add(warmBounce)

  const coolFacade = new THREE.RectAreaLight(
    studioLightingConfig.coolFacade.color,
    studioLightingConfig.coolFacade.intensity,
    studioLightingConfig.coolFacade.width,
    studioLightingConfig.coolFacade.height,
  )
  coolFacade.name = 'CoolFacadeFill'
  coolFacade.position.set(...studioLightingConfig.coolFacade.position)
  coolFacade.lookAt(new THREE.Vector3(...studioLightingConfig.coolFacade.target))
  group.add(coolFacade)

  const nightPractical = new THREE.PointLight(
    studioLightingConfig.nightPractical.color,
    0,
    studioLightingConfig.nightPractical.distance,
    2,
  )
  nightPractical.name = 'NightPractical'
  nightPractical.position.set(...studioLightingConfig.nightPractical.position)
  nightPractical.castShadow = true
  nightPractical.shadow.mapSize.set(1024, 1024)
  nightPractical.shadow.bias = -0.0001
  nightPractical.shadow.normalBias = 0.025
  group.add(nightPractical)

  const profiles = {
    realistic: {
      ambient: studioLightingConfig.ambient.intensity,
      hemisphere: studioLightingConfig.hemisphere.intensity,
      key: studioLightingConfig.warmKey.intensity,
      warmBounce: studioLightingConfig.warmBounce.intensity,
      coolFacade: studioLightingConfig.coolFacade.intensity,
      nightPractical: 0,
    },
    night: {
      ambient: 0.055,
      hemisphere: 0.13,
      key: 0.42,
      warmBounce: 2.4,
      coolFacade: 2.8,
      nightPractical: studioLightingConfig.nightPractical.intensity,
    },
  }

  group.userData.profile = 'realistic'
  group.userData.setProfile = (profileName) => {
    const profile = profiles[profileName] || profiles.realistic
    group.userData.profile = profileName in profiles ? profileName : 'realistic'
    ambient.intensity = profile.ambient
    hemisphere.intensity = profile.hemisphere
    key.intensity = profile.key
    warmBounce.intensity = profile.warmBounce
    coolFacade.intensity = profile.coolFacade
    nightPractical.intensity = profile.nightPractical
  }
  return group
}
