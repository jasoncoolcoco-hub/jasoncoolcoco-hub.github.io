import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { heroCameraConfig } from '../config/studioConfig'
import { createCentralPaddedStage } from './CentralPaddedStage'
import { createCurtainZones } from './CurtainZones'
import { createDebugCameraTools } from './DebugCameraControls'
import { createGlassFacade } from './GlassFacade'
import { createStudioMaterials } from './createStudioMaterials'
import { createStudioLighting } from './StudioLighting'
import { createStudioShell } from './StudioShell'

export function createFredStudioScene({ mount, debug = false, reviewView = null, onCameraChange }) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#11120f')
  scene.fog = new THREE.Fog('#151511', 76, 132)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65))
  renderer.setSize(mount.clientWidth, mount.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
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
  controls.minDistance = 22
  controls.maxDistance = 76
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
  architecture.add(createCurtainZones(materials))
  architecture.add(createCentralPaddedStage(materials))
  architecture.add(createGlassFacade(materials))
  scene.add(architecture)
  scene.add(createStudioLighting())

  const debugTools = createDebugCameraTools(scene, camera, controls)
  if (reviewView && reviewView !== 'wireframe') {
    debugTools.setView(reviewView)
    if (reviewView === 'top') {
      architecture.getObjectByName('SlopedCeiling').visible = false
      architecture.getObjectByName('CeilingCanopy').visible = false
    }
  }
  if (reviewView === 'wireframe') {
    debugTools.setView('hero')
    debugTools.setWireframe(true)
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

  let animationFrame
  const render = () => {
    if (debug) controls.update()
    renderer.render(scene, camera)
    animationFrame = requestAnimationFrame(render)
  }
  render()

  return {
    ...debugTools,
    dispose() {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.removeEventListener('change', notifyCameraChange)
      controls.dispose()
      scene.traverse((object) => {
        object.geometry?.dispose()
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
        objectMaterials.forEach((material) => {
          material?.map?.dispose()
          material?.dispose()
        })
      })
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
