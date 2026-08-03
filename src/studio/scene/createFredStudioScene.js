import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { heroCameraConfig, studioLayout, studioRenderingConfig } from '../config/studioConfig'
import { createCentralPaddedStage } from './CentralPaddedStage'
import { createDebugCameraTools } from './DebugCameraControls'
import { createStudioMaterials } from './createStudioMaterials'
import { createStudioLighting } from './StudioLighting'
import { createStudioShell } from './StudioShell'

export function createFredStudioScene({
  mount,
  debug = false,
  reviewView = null,
  onCameraChange,
  onCoordinatePick,
}) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#171714')
  scene.fog = new THREE.Fog('#171714', 165, 270)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, studioRenderingConfig.maxDpr))
  renderer.setSize(mount.clientWidth, mount.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = studioRenderingConfig.exposure
  renderer.physicallyCorrectLights = true
  if ('useLegacyLights' in renderer) renderer.useLegacyLights = false
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  mount.appendChild(renderer.domElement)

  const camera = new THREE.PerspectiveCamera(
    heroCameraConfig.fov,
    mount.clientWidth / mount.clientHeight,
    heroCameraConfig.near,
    heroCameraConfig.far,
  )
  camera.position.set(...heroCameraConfig.position)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(...heroCameraConfig.target)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.enabled = debug
  controls.enablePan = debug
  controls.minDistance = 38
  controls.maxDistance = 180
  controls.minPolarAngle = Math.PI * 0.08
  controls.maxPolarAngle = Math.PI * 0.47
  controls.minAzimuthAngle = -Math.PI
  controls.maxAzimuthAngle = Math.PI
  controls.update()
  if (!debug) camera.rotateZ(heroCameraConfig.roll)

  const materials = createStudioMaterials()
  const architecture = new THREE.Group()
  architecture.name = 'FredStudioArchitecture'
  architecture.add(createStudioShell(materials))
  if (studioLayout.centralStage.visibility) {
    architecture.add(createCentralPaddedStage(materials))
  }
  scene.add(architecture)
  const lightingGroup = createStudioLighting()
  scene.add(lightingGroup)

  const debugTools = createDebugCameraTools({
    scene,
    camera,
    controls,
    renderer,
    materials,
    lightingGroup,
    coordinatePicking: debug,
    onCoordinatePick,
  })
  if (reviewView) {
    if (['top', 'left', 'right', 'section', 'shell', 'glass', 'floor', 'junction'].includes(reviewView)) {
      debugTools.setView(reviewView)
    }
    if (reviewView === 'top') {
      architecture.getObjectByName('Face3RoofPlane').visible = false
    }
    if (reviewView === 'shell') {
      debugTools.setGrid(true)
      debugTools.setAxes(true)
    }
    if (reviewView === 'clay') {
      debugTools.setView('hero')
      debugTools.setRenderMode('clay')
    }
    if (reviewView === 'night') {
      debugTools.setView('hero')
      debugTools.setNightMode(true)
      scene.background.set('#080c0e')
      scene.fog.color.set('#080c0e')
    }
    if (reviewView === 'wireframe') {
      debugTools.setView('hero')
      debugTools.setWireframe(true)
    }
  }

  const notifyCameraChange = () => onCameraChange?.(debugTools.getCameraState())
  controls.addEventListener('change', notifyCameraChange)
  notifyCameraChange()

  const resize = () => {
    const width = mount.clientWidth
    const height = mount.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(mount)

  const diagnostics = {
    fps: 0,
    dpr: renderer.getPixelRatio(),
    shadowMapSize: studioRenderingConfig.shadowMapSize,
    textureSizes: materials.__textureSizes,
    triangles: 0,
  }
  window.__FRED_STUDIO_DIAGNOSTICS__ = diagnostics
  mount.dataset.renderDpr = diagnostics.dpr.toFixed(2)
  mount.dataset.shadowMapSize = String(diagnostics.shadowMapSize)
  let frameCount = 0
  let lastFpsSample = performance.now()
  let animationFrame
  const render = (time) => {
    if (debug) controls.update()
    renderer.render(scene, camera)
    frameCount += 1
    if (time - lastFpsSample >= 1000) {
      diagnostics.fps = Math.round(frameCount * 1000 / (time - lastFpsSample))
      diagnostics.triangles = renderer.info.render.triangles
      mount.dataset.fps = String(diagnostics.fps)
      mount.dataset.triangles = String(diagnostics.triangles)
      frameCount = 0
      lastFpsSample = time
    }
    animationFrame = requestAnimationFrame(render)
  }
  animationFrame = requestAnimationFrame(render)

  return {
    ...debugTools,
    dispose() {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.removeEventListener('change', notifyCameraChange)
      controls.dispose()
      debugTools.disposeDebugMaterials()
      const geometries = new Set()
      const disposableMaterials = new Set(Object.values(materials).filter((material) => material?.isMaterial))
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry)
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
        objectMaterials.forEach((material) => material?.isMaterial && disposableMaterials.add(material))
      })
      geometries.forEach((geometry) => geometry.dispose())
      disposableMaterials.forEach((material) => {
        ;['map', 'roughnessMap', 'bumpMap', 'normalMap', 'aoMap'].forEach((key) => material[key]?.dispose())
        material.dispose()
      })
      if (window.__FRED_STUDIO_DIAGNOSTICS__ === diagnostics) delete window.__FRED_STUDIO_DIAGNOSTICS__
      delete mount.dataset.fps
      delete mount.dataset.renderDpr
      delete mount.dataset.shadowMapSize
      delete mount.dataset.triangles
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
