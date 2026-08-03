import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

function roundedBox(width, height, depth, radius, material) {
  const shape = new THREE.Shape()
  const x = -width / 2
  const y = -height / 2
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(radius * 0.35, 0.05),
    bevelThickness: 0.025,
    curveSegments: 5,
  })
  geometry.center()
  return new THREE.Mesh(geometry, material)
}

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function tag(group, id) {
  group.userData.interactionId = id
  group.traverse((child) => {
    if (child.isMesh) {
      if (child.material?.isMeshStandardMaterial) child.material = child.material.clone()
      child.userData.interactionId = id
    }
  })
  return group
}

function createHomeScreenTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 640
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8

  const draw = (image) => {
    context.fillStyle = '#f7f6f2'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#191919'
    context.font = '600 18px Arial'
    context.fillText('JASON LI PERSONAL WEBSITE', 34, 42)
    context.font = '600 16px Arial'
    context.textAlign = 'center'
    context.fillText('HOME', 512, 42)
    context.textAlign = 'right'
    context.fillStyle = '#6d6c68'
    context.fillText('PHONE   EMAIL   GITHUB', 990, 42)
    context.textAlign = 'left'

    if (image) {
      const frame = { x: 145, y: 88, width: 760, height: 405 }
      const imageRatio = image.width / image.height
      const frameRatio = frame.width / frame.height
      let sourceWidth = image.width
      let sourceHeight = image.height
      let sourceX = 0
      let sourceY = 0
      if (imageRatio > frameRatio) {
        sourceWidth = image.height * frameRatio
        sourceX = (image.width - sourceWidth) / 2
      } else {
        sourceHeight = image.width / frameRatio
        sourceY = (image.height - sourceHeight) / 2
      }
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, frame.x, frame.y, frame.width, frame.height)
    } else {
      const gradient = context.createLinearGradient(145, 88, 905, 493)
      gradient.addColorStop(0, '#5e7775')
      gradient.addColorStop(1, '#d6a77b')
      context.fillStyle = gradient
      context.fillRect(145, 88, 760, 405)
    }

    context.fillStyle = '#282828'
    context.font = '500 15px Arial'
    context.fillText('Every journey begins with a destination, but it is rarely the destination we remember most.', 145, 540)
    context.fillStyle = '#77736d'
    context.font = '600 12px Arial'
    context.fillText('01  HOME     02  FOOTPRINTS     03  PROJECTS', 145, 582)
    texture.needsUpdate = true
  }

  draw()
  const image = new Image()
  image.onload = () => draw(image)
  image.src = '/images/hero/jason-li-hero-1440.jpg'
  return texture
}

function createWoodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 320
  const context = canvas.getContext('2d')
  context.fillStyle = '#8e6748'
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < 90; index += 1) {
    const y = (index / 90) * canvas.height + Math.sin(index * 1.7) * 3
    const opacity = 0.025 + (index % 7) * 0.006
    context.strokeStyle = `rgba(55, 30, 17, ${opacity})`
    context.lineWidth = index % 11 === 0 ? 2 : 1
    context.beginPath()
    context.moveTo(0, y)
    context.bezierCurveTo(280, y + Math.sin(index) * 7, 680, y - Math.cos(index) * 6, canvas.width, y + 2)
    context.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.4, 1)
  texture.anisotropy = 8
  return texture
}

function createMapTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1400
  canvas.height = 760
  const context = canvas.getContext('2d')
  context.fillStyle = '#ded8ca'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = 'rgba(70, 72, 66, 0.12)'
  context.lineWidth = 1
  for (let x = 40; x < canvas.width; x += 55) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke()
  }
  for (let y = 40; y < canvas.height; y += 55) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke()
  }

  const regions = [
    [[82,185],[130,116],[220,88],[314,112],[358,161],[319,211],[270,223],[241,278],[194,303],[164,267],[104,257],[66,220]],
    [[295,307],[356,337],[379,405],[363,478],[334,552],[302,636],[268,591],[255,520],[228,456],[237,376]],
    [[437,126],[505,91],[583,100],[623,138],[681,140],[729,183],[705,227],[639,244],[598,285],[531,269],[489,225],[444,205]],
    [[566,284],[642,285],[704,332],[717,402],[684,489],[631,573],[578,526],[549,450],[519,384]],
    [[674,143],[780,94],[916,91],[1046,124],[1158,176],[1208,226],[1152,267],[1066,256],[1002,302],[934,291],[878,250],[812,262],[756,229]],
    [[1014,317],[1058,340],[1077,391],[1044,431],[1013,399]],
    [[1129,443],[1197,414],[1287,451],[1304,516],[1248,560],[1172,546],[1113,501]],
    [[1310,233],[1341,246],[1328,287],[1300,274]],
  ]
  context.fillStyle = '#6d746d'
  context.strokeStyle = '#565e58'
  context.lineWidth = 3
  regions.forEach((points) => {
    context.beginPath()
    points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y))
    context.closePath()
    context.fill()
    context.stroke()
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function createPhotoTexture(colors, variant = 0) {
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 440
  const context = canvas.getContext('2d')
  const gradient = context.createLinearGradient(0, 0, 360, 440)
  gradient.addColorStop(0, colors[0])
  gradient.addColorStop(1, colors[1])
  context.fillStyle = gradient
  context.fillRect(0, 0, 360, 440)
  context.fillStyle = variant % 2 ? 'rgba(38,45,48,.42)' : 'rgba(84,67,48,.38)'
  context.beginPath()
  context.moveTo(0, 320)
  context.lineTo(90, 210 + variant * 15)
  context.lineTo(166, 296)
  context.lineTo(255, 170 + variant * 20)
  context.lineTo(360, 290)
  context.lineTo(360, 440)
  context.lineTo(0, 440)
  context.fill()
  context.fillStyle = 'rgba(235,222,190,.28)'
  context.beginPath()
  context.arc(276 - variant * 24, 96, 38, 0, Math.PI * 2)
  context.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createRoomObjects(materials) {
  const root = new THREE.Group()
  const workspace = new THREE.Group()
  const interactives = []

  const desk = new THREE.Group()
  const deskTop = roundedBox(6.5, 0.26, 2.5, 0.1, materials.wood)
  deskTop.position.y = 2.55
  desk.add(deskTop)
  ;[-2.85, 2.85].forEach((x) => [-0.92, 0.92].forEach((z) => {
    const leg = box(0.18, 2.48, 0.18, materials.darkMetal)
    leg.position.set(x, 1.25, z)
    desk.add(leg)
  }))
  desk.position.set(-0.8, 0, -0.95)
  workspace.add(tag(desk, 'desk')); interactives.push(desk)

  const stool = new THREE.Group()
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.72, 0.22, 40), materials.seat)
  seat.position.y = 1.63; seat.castShadow = true; seat.receiveShadow = true; stool.add(seat)
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.5, 20), materials.darkMetal)
  post.position.y = 0.83; post.castShadow = true; stool.add(post)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.78, 0.09, 36), materials.darkMetal)
  base.position.y = 0.07; base.castShadow = true; stool.add(base)
  stool.position.set(2.55, 0, 2.05)
  root.add(tag(stool, 'stool')); interactives.push(stool)

  const macbook = new THREE.Group()
  const baseBody = roundedBox(2.9, 0.1, 1.75, 0.08, materials.aluminum)
  baseBody.position.y = 2.78; macbook.add(baseBody)
  const screenBody = roundedBox(2.88, 1.75, 0.08, 0.1, materials.aluminum)
  screenBody.position.set(0, 3.62, -0.76); screenBody.rotation.x = -0.08; macbook.add(screenBody)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.62, 1.49), new THREE.MeshBasicMaterial({ map: createHomeScreenTexture(), toneMapped: false }))
  screen.position.set(0, 3.63, -0.711); screen.rotation.x = -0.08; macbook.add(screen)
  const cameraDot = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), materials.black)
  cameraDot.position.set(0, 4.42, -0.704); cameraDot.rotation.x = -0.08; macbook.add(cameraDot)
  macbook.position.set(0.4, 0, -0.85)
  workspace.add(tag(macbook, 'macbook')); interactives.push(macbook)

  const trays = new THREE.Group()
  for (let level = 0; level < 3; level += 1) {
    const y = 2.78 + level * 0.36
    const trayBase = box(1.78, 0.08, 1.35, materials.tray)
    trayBase.position.y = y; trays.add(trayBase)
    ;[-0.84, 0.84].forEach((x) => {
      const rail = box(0.08, 0.25, 1.35, materials.tray)
      rail.position.set(x, y + 0.13, 0); trays.add(rail)
    })
    const back = box(1.78, 0.25, 0.07, materials.tray)
    back.position.set(0, y + 0.13, -0.64); trays.add(back)
    for (let paper = 0; paper < 3 - level; paper += 1) {
      const sheet = box(1.5, 0.015, 1.08, materials.paper)
      sheet.position.set((paper - 1) * 0.025, y + 0.075 + paper * 0.018, 0.02 + paper * 0.02)
      sheet.rotation.y = (paper - 1) * 0.012
      trays.add(sheet)
    }
  }
  trays.position.set(-3.05, 0, -0.82)
  workspace.add(tag(trays, 'tray')); interactives.push(trays)

  workspace.rotation.y = THREE.MathUtils.degToRad(-12)
  root.add(workspace)

  const map = new THREE.Group()
  const frame = box(7.1, 3.62, 0.16, materials.mapFrame)
  map.add(frame)
  const print = new THREE.Mesh(new THREE.PlaneGeometry(6.72, 3.24), new THREE.MeshStandardMaterial({ map: createMapTexture(), roughness: 0.9 }))
  print.position.z = 0.086; print.castShadow = true; map.add(print)
  map.position.set(1.45, 6.42, -6.79)
  root.add(tag(map, 'map')); interactives.push(map)

  const polaroids = new THREE.Group()
  const photoData = [
    { x: -5.7, y: 5.8, r: 0.08, colors: ['#9ba9ab', '#d9b07c'] },
    { x: -4.82, y: 5.12, r: -0.06, colors: ['#617c80', '#d7c7a1'] },
    { x: -6.02, y: 4.52, r: 0.035, colors: ['#c39473', '#5f6d69'] },
  ]
  photoData.forEach((photo, index) => {
    const card = box(0.78, 0.96, 0.035, materials.photoPaper)
    card.position.set(photo.x, photo.y, -6.855); card.rotation.z = photo.r; polaroids.add(card)
    const image = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.66), new THREE.MeshStandardMaterial({ map: createPhotoTexture(photo.colors, index), roughness: 0.96 }))
    image.position.set(photo.x, photo.y + 0.09, -6.835); image.rotation.z = photo.r; image.castShadow = true; polaroids.add(image)
    const tape = box(0.24, 0.13, 0.015, materials.tape)
    tape.position.set(photo.x, photo.y + 0.51, -6.805); tape.rotation.z = photo.r * 0.35; polaroids.add(tape)
  })
  root.add(tag(polaroids, 'polaroids')); interactives.push(polaroids)

  const pegboard = new THREE.Group()
  const board = box(0.14, 7.1, 7.6, materials.pegboard)
  pegboard.add(board)
  const holeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.024, 14)
  for (let y = -3.28; y <= 3.28; y += 0.38) {
    for (let z = -3.52; z <= 3.52; z += 0.38) {
      const hole = new THREE.Mesh(holeGeometry, materials.hole)
      hole.rotation.z = Math.PI / 2
      hole.position.set(-0.081, y, z)
      pegboard.add(hole)
    }
  }
  pegboard.position.set(12.59, 3.85, -2.78)
  root.add(tag(pegboard, 'pegboard')); interactives.push(pegboard)

  return { root, interactives }
}

export function createRoomScene({ mount }) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#dedbd4')
  scene.fog = new THREE.Fog('#dedbd4', 29, 47)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setSize(mount.clientWidth, mount.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.98
  mount.appendChild(renderer.domElement)

  const camera = new THREE.PerspectiveCamera(36, mount.clientWidth / mount.clientHeight, 0.1, 60)
  camera.position.set(14.7, 8.35, 19.35)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(1.4, 3.1, -1.8)
  controls.enableDamping = true
  controls.dampingFactor = 0.055
  controls.enablePan = false
  controls.minDistance = 20.5
  controls.maxDistance = 28.5
  controls.minPolarAngle = Math.PI * 0.31
  controls.maxPolarAngle = Math.PI * 0.47
  controls.minAzimuthAngle = -Math.PI * 0.26
  controls.maxAzimuthAngle = Math.PI * 0.21
  controls.zoomSpeed = 0.34
  controls.rotateSpeed = 0.36
  controls.update()

  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: '#ddd9cf', roughness: 0.97 }),
    floor: new THREE.MeshStandardMaterial({ color: '#aa9479', roughness: 0.83 }),
    wood: new THREE.MeshStandardMaterial({ color: '#916b4c', map: createWoodTexture(), roughness: 0.66 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#252625', roughness: 0.5, metalness: 0.46 }),
    seat: new THREE.MeshStandardMaterial({ color: '#776452', roughness: 0.93 }),
    aluminum: new THREE.MeshStandardMaterial({ color: '#3f4242', roughness: 0.3, metalness: 0.74 }),
    black: new THREE.MeshBasicMaterial({ color: '#111' }),
    tray: new THREE.MeshStandardMaterial({ color: '#171918', roughness: 0.62, metalness: 0.34 }),
    paper: new THREE.MeshStandardMaterial({ color: '#e9e3d7', roughness: 0.9 }),
    mapFrame: new THREE.MeshStandardMaterial({ color: '#443229', roughness: 0.7 }),
    photoPaper: new THREE.MeshStandardMaterial({ color: '#eee8dc', roughness: 0.96 }),
    tape: new THREE.MeshStandardMaterial({ color: '#d7c4a0', transparent: true, opacity: 0.75, roughness: 0.88 }),
    pegboard: new THREE.MeshStandardMaterial({ color: '#c4aa82', roughness: 0.87 }),
    hole: new THREE.MeshBasicMaterial({ color: '#5c4c3a' }),
  }

  const floor = box(25.6, 0.22, 21, materials.floor)
  floor.position.set(0, -0.12, 3.5)
  scene.add(floor)
  const backWall = box(25.6, 10.2, 0.25, materials.wall)
  backWall.position.set(0, 5.1, -7)
  scene.add(backWall)
  const sideWall = box(0.25, 10.2, 21, materials.wall)
  sideWall.position.set(12.8, 5.1, 3.5)
  scene.add(sideWall)

  const room = createRoomObjects(materials)
  scene.add(room.root)

  const ambient = new THREE.HemisphereLight('#f5efe4', '#76624e', 2.25)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight('#fff5df', 4.15)
  sun.position.set(-7.5, 14, 11)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -15; sun.shadow.camera.right = 15
  sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -6
  sun.shadow.bias = -0.0002
  scene.add(sun)
  const fill = new THREE.PointLight('#d8e3e3', 1.2, 30)
  fill.position.set(9, 7.2, 8)
  scene.add(fill)

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerDown = null

  const applySelection = (id) => {
    renderer.domElement.dataset.selectedObject = id
  }

  const hitTest = (event) => {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObjects(room.interactives, true).find((hit) => hit.object.userData.interactionId)
  }

  const onPointerMove = (event) => {
    if (pointerDown) return
    renderer.domElement.style.cursor = hitTest(event) ? 'pointer' : 'grab'
  }
  const onPointerDown = (event) => { pointerDown = { x: event.clientX, y: event.clientY } }
  const onPointerUp = (event) => {
    const start = pointerDown
    pointerDown = null
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return
    const hit = hitTest(event)
    if (!hit) return
    const id = hit.object.userData.interactionId
    applySelection(id)
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)

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
    controls.update()
    renderer.render(scene, camera)
    animationFrame = requestAnimationFrame(render)
  }
  render()

  return {
    dispose() {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
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
