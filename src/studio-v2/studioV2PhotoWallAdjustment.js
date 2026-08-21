import * as THREE from 'three'
import {
  boardCoordinatesToStudioV2Position,
  studioV2PositionToPhotoBoardCoordinates,
  STUDIO_V2_PHOTO_BOARD_COORDINATES,
  STUDIO_V2_PHOTO_BOARD_SURFACE,
} from './studioV2PhotoBoardLayout.js'
import {
  applyStudioV2PhotoStableDepth,
  STUDIO_V2_PHOTO_CARD_SCALE,
} from './studioV2PhotoPackaging.js'
import {
  bringStudioV2PhotoStackToFront,
  moveStudioV2PhotoStackBackward,
  resolveStudioV2PhotoDepthRanks,
} from './studioV2PhotoStacking.js'

export const STUDIO_V2_PHOTO_FIRST_LAYER_COUNT = 39
export const STUDIO_V2_PHOTO_OCCLUSION_LIMIT = 0.1
export const STUDIO_V2_PHOTO_USABLE_MARGIN = 2

const DRAFT_STORAGE_KEY = 'fred-studio-v2:photo-wall-adjustment:v1'
const SNAPSHOT_STORAGE_KEY = 'fred-studio-v2:photo-wall-adjustment:start:v1'
const DRAG_PRECISION = 2

function rounded(value, digits = DRAG_PRECISION) {
  return Number(value.toFixed(digits))
}

function cardPointFromLocal(card, localX, localY) {
  const radians = card.rotation * Math.PI / 180
  const worldX = (
    localX * Math.cos(radians) - localY * Math.sin(radians)
  ) * STUDIO_V2_PHOTO_CARD_SCALE
  const worldY = (
    localX * Math.sin(radians) + localY * Math.cos(radians)
  ) * STUDIO_V2_PHOTO_CARD_SCALE
  return {
    x: card.x - worldX / STUDIO_V2_PHOTO_BOARD_SURFACE.worldWidth * 100,
    y: card.y - worldY / STUDIO_V2_PHOTO_BOARD_SURFACE.worldHeight * 100,
  }
}

function cardContainsPoint(card, point) {
  const worldX = -(point.x - card.x) / 100 * STUDIO_V2_PHOTO_BOARD_SURFACE.worldWidth
  const worldY = -(point.y - card.y) / 100 * STUDIO_V2_PHOTO_BOARD_SURFACE.worldHeight
  const radians = card.rotation * Math.PI / 180
  const localX = (
    worldX * Math.cos(radians) + worldY * Math.sin(radians)
  ) / STUDIO_V2_PHOTO_CARD_SCALE
  const localY = (
    -worldX * Math.sin(radians) + worldY * Math.cos(radians)
  ) / STUDIO_V2_PHOTO_CARD_SCALE
  return Math.abs(localX) <= card.width / 2 && Math.abs(localY) <= card.height / 2
}

function cardCorners(card) {
  return [
    [-card.width / 2, -card.height / 2],
    [card.width / 2, -card.height / 2],
    [card.width / 2, card.height / 2],
    [-card.width / 2, card.height / 2],
  ].map(([x, y]) => cardPointFromLocal(card, x, y))
}

function boundingBox(card) {
  const corners = cardCorners(card)
  return {
    bottom: Math.max(...corners.map(({ y }) => y)),
    left: Math.min(...corners.map(({ x }) => x)),
    right: Math.max(...corners.map(({ x }) => x)),
    top: Math.min(...corners.map(({ y }) => y)),
  }
}

function boxesOverlap(left, right) {
  const a = boundingBox(left)
  const b = boundingBox(right)
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function isHigherCard(candidate, target) {
  return candidate.zOrder > target.zOrder
    || (candidate.zOrder === target.zOrder && candidate.slotNumber > target.slotNumber)
}

export function measureStudioV2PhotoWallOcclusion(cards, resolution = 160) {
  const results = cards.map((target) => {
    const occluders = cards.filter((candidate) => (
      candidate.id !== target.id
      && isHigherCard(candidate, target)
      && boxesOverlap(candidate, target)
    ))
    let covered = 0
    if (occluders.length) {
      for (let row = 0; row < resolution; row += 1) {
        const localY = ((row + 0.5) / resolution - 0.5) * target.height
        for (let column = 0; column < resolution; column += 1) {
          const localX = ((column + 0.5) / resolution - 0.5) * target.width
          const point = cardPointFromLocal(target, localX, localY)
          if (occluders.some((candidate) => cardContainsPoint(candidate, point))) covered += 1
        }
      }
    }
    const occlusion = covered / (resolution * resolution)
    const insideUsableArea = cardCorners(target).every(({ x, y }) => (
      x >= STUDIO_V2_PHOTO_USABLE_MARGIN
      && x <= 100 - STUDIO_V2_PHOTO_USABLE_MARGIN
      && y >= STUDIO_V2_PHOTO_USABLE_MARGIN
      && y <= 100 - STUDIO_V2_PHOTO_USABLE_MARGIN
    ))
    return { id: target.id, insideUsableArea, occlusion, slotNumber: target.slotNumber }
  })
  const failures = results.filter(({ insideUsableArea, occlusion }) => (
    !insideUsableArea || occlusion > STUDIO_V2_PHOTO_OCCLUSION_LIMIT
  ))
  return {
    failures,
    maximumOcclusion: Math.max(0, ...results.map(({ occlusion }) => occlusion)),
    results,
    valid: failures.length === 0,
  }
}

export function resolveStudioV2SecondLayerIds(manifest) {
  const realPhotos = manifest.photos.filter(({ width, height }) => (
    Number.isFinite(width) && Number.isFinite(height)
  ))
  return new Set(realPhotos.slice(STUDIO_V2_PHOTO_FIRST_LAYER_COUNT).map(({ id }) => id))
}

export function bringStudioV2PhotoRecordToFront(records, target) {
  return bringStudioV2PhotoStackToFront(records, target)
}

function createPanel({ adjustableCount, baseCount, newCount, unplacedCount }) {
  const panel = document.createElement('aside')
  panel.className = 'studio-v2__photo-adjustment'
  panel.setAttribute('aria-label', 'Photo Wall manual adjustment controls')
  panel.innerHTML = `
    <header><strong>PHOTO WALL ADJUSTMENT</strong><span>DEBUG ONLY</span><button type="button" data-action="toggle" aria-expanded="true">HIDE</button></header>
    <p class="studio-v2__photo-adjustment-summary"></p>
    <output class="studio-v2__photo-adjustment-selection">SELECT ANY PHOTO</output>
    <div class="studio-v2__photo-adjustment-rotation" aria-label="Selected photo rotation controls">
      <button type="button" data-action="rotate-down" disabled>−1°</button>
      <label>ANGLE <input type="number" data-field="rotation" step="0.1" min="-180" max="180" disabled><span>°</span></label>
      <button type="button" data-action="rotate-up" disabled>+1°</button>
    </div>
    <p class="studio-v2__photo-adjustment-help">DRAG · ARROWS NUDGE · [ ] ROTATE · PAGE ↑ ↓ DEPTH</p>
    <div class="studio-v2__photo-adjustment-actions">
      <button type="button" data-action="copy">COPY PATCH</button>
      <button type="button" data-action="download">DOWNLOAD MANIFEST</button>
      <button type="button" data-action="reset">RESTORE START</button>
    </div>
    <output class="studio-v2__photo-adjustment-status" aria-live="polite">READY</output>
  `
  panel.querySelector('.studio-v2__photo-adjustment-summary').textContent = (
    `${adjustableCount} PHOTOS ADJUSTABLE · ${baseCount} BASE + ${newCount} NEW · FREE OVERLAP`
    + (unplacedCount ? ` · ${unplacedCount} UNPLACED` : '')
  )
  return panel
}

function manifestWithDraft(manifest, draft) {
  return {
    ...manifest,
    photos: manifest.photos.map((photo) => draft[photo.id]
      ? { ...photo, ...draft[photo.id] }
      : photo),
  }
}

export async function createStudioV2PhotoWallAdjustment({
  boardScale = 2,
  camera,
  domElement,
  manifestUrl,
  mount,
  photoBoardRoot,
}) {
  const response = await fetch(manifestUrl, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Photo adjustment manifest request failed: ${response.status}.`)
  const manifest = await response.json()
  const realPhotos = manifest.photos.filter(({ width, height }) => (
    Number.isFinite(width) && Number.isFinite(height)
  ))
  const realPhotoIds = new Set(realPhotos.map(({ id }) => id))
  const secondLayerIds = resolveStudioV2SecondLayerIds(manifest)
  const records = []
  photoBoardRoot.updateMatrixWorld(true)
  photoBoardRoot.traverse((object) => {
    const packaging = object.userData?.photoPackaging
    if (!Number.isFinite(packaging?.slotNumber)) return
    records.push({
      height: packaging.dimensions.height,
      id: object.userData.studioV2Id,
      object,
      rotation: packaging.rotation,
      slotNumber: packaging.slotNumber,
      width: packaging.dimensions.width,
      x: packaging.boardCoordinates.x,
      y: packaging.boardCoordinates.y,
      zOrder: packaging.boardCoordinates.zOrder,
    })
  })
  const recordById = new Map(records.map((record) => [record.id, record]))
  const editableRecords = records.filter(({ id }) => realPhotoIds.has(id))
  const originalState = Object.fromEntries(editableRecords.map((record) => [record.id, {
    rotation: record.rotation,
    x: record.x,
    y: record.y,
    zOrder: record.zOrder,
  }]))
  localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(originalState))
  let draft = {}
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) ?? '{}')
    draft = Object.fromEntries(Object.entries(stored).filter(([id, value]) => (
      recordById.has(id)
      && Number.isFinite(value?.x)
      && Number.isFinite(value?.y)
      && Number.isFinite(value?.rotation)
      && Number.isFinite(value?.zOrder)
    )))
  } catch {
    draft = {}
  }

  const applyRecords = () => {
    const depthPlan = resolveStudioV2PhotoDepthRanks(records, {
      boardHeight: STUDIO_V2_PHOTO_BOARD_SURFACE.worldHeight,
      boardWidth: STUDIO_V2_PHOTO_BOARD_SURFACE.worldWidth,
      cardScale: STUDIO_V2_PHOTO_CARD_SCALE,
    })
    records.forEach((record) => {
      const position = boardCoordinatesToStudioV2Position({
        boardScale,
        x: record.x,
        y: record.y,
        zOrder: 0,
      })
      record.object.position.copy(position)
      record.object.userData.studioV2PhotoBaseZ = position.z
      applyStudioV2PhotoStableDepth(record.object, depthPlan.ranks.get(record.id) ?? 0, boardScale)
      record.object.rotation.z = THREE.MathUtils.degToRad(record.rotation)
      record.object.updateMatrixWorld(true)
    })
  }
  Object.entries(draft).forEach(([id, value]) => {
    const record = recordById.get(id)
    if (!record) return
    Object.assign(record, value)
  })
  applyRecords()

  const unplacedCount = [...realPhotoIds].filter((id) => !recordById.has(id)).length
  const placedNewCount = editableRecords.filter(({ id }) => secondLayerIds.has(id)).length
  const panel = createPanel({
    adjustableCount: editableRecords.length,
    baseCount: editableRecords.length - placedNewCount,
    newCount: placedNewCount,
    unplacedCount,
  })
  const selectionOutput = panel.querySelector('.studio-v2__photo-adjustment-selection')
  const rotationInput = panel.querySelector('[data-field="rotation"]')
  const rotationButtons = [
    panel.querySelector('[data-action="rotate-down"]'),
    panel.querySelector('[data-action="rotate-up"]'),
  ]
  const statusOutput = panel.querySelector('.studio-v2__photo-adjustment-status')
  const panelRoot = mount.parentElement ?? mount
  panelRoot.appendChild(panel)

  const updateDataset = () => {
    mount.dataset.photoWallAdjustment = 'ready'
    mount.dataset.photoWallAdjustmentEditable = String(editableRecords.length)
    mount.dataset.photoWallAdjustmentLocked = '0'
    mount.dataset.photoWallAdjustmentDrafts = String(Object.keys(draft).length)
    mount.dataset.photoWallAdjustmentSnapshot = 'ready'
  }
  const describeSelection = (record) => {
    if (!record) return 'SELECT ANY PHOTO'
    const filename = manifest.photos.find(({ id }) => id === record.id)?.filename ?? record.id
    return `${filename} · X ${record.x.toFixed(2)} · Y ${record.y.toFixed(2)} · R ${record.rotation.toFixed(1)}° · Z ${record.zOrder}`
  }
  const setStatus = (text, invalid = false) => {
    statusOutput.textContent = text
    statusOutput.classList.toggle('is-invalid', invalid)
  }
  const updateRotationControls = (record) => {
    rotationInput.disabled = !record
    rotationInput.value = record ? record.rotation.toFixed(1) : ''
    rotationButtons.forEach((button) => { button.disabled = !record })
  }
  const saveRecords = (changedRecords, selection = selected) => {
    changedRecords.forEach((record) => {
      const initial = originalState[record.id]
      const next = {
        rotation: rounded(record.rotation, 1),
        x: rounded(record.x),
        y: rounded(record.y),
        zOrder: rounded(record.zOrder),
      }
      if (JSON.stringify(next) === JSON.stringify(initial)) delete draft[record.id]
      else draft[record.id] = next
    })
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    selectionOutput.textContent = describeSelection(selection)
    updateRotationControls(selection)
    updateDataset()
  }

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const plane = new THREE.Plane()
  const planePoint = boardCoordinatesToStudioV2Position({ boardScale, x: 50, y: 50 })
  photoBoardRoot.localToWorld(planePoint)
  const planeNormal = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(photoBoardRoot.getWorldQuaternion(new THREE.Quaternion()))
    .normalize()
  plane.setFromNormalAndCoplanarPoint(planeNormal, planePoint)
  const editableObjects = new Set(editableRecords.map(({ object }) => object))
  const editableMeshes = editableRecords.map(({ object }) => object)
  let selected = null
  let drag = null

  const rayFromEvent = (event) => {
    const bounds = domElement.getBoundingClientRect()
    pointer.set(
      (event.clientX - bounds.left) / bounds.width * 2 - 1,
      -(event.clientY - bounds.top) / bounds.height * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    return raycaster
  }
  const editableRecordFromHit = (event) => {
    const hit = rayFromEvent(event).intersectObjects(editableMeshes, true)[0]
    let object = hit?.object ?? null
    while (object && !editableObjects.has(object)) object = object.parent
    return object ? recordById.get(object.userData.studioV2Id) ?? null : null
  }
  const boardPointFromEvent = (event) => {
    const worldPoint = rayFromEvent(event).ray.intersectPlane(plane, new THREE.Vector3())
    if (!worldPoint) return null
    const localPoint = photoBoardRoot.worldToLocal(worldPoint.clone())
    return studioV2PositionToPhotoBoardCoordinates(localPoint)
  }
  const onPointerMove = (event) => {
    if (!drag) {
      domElement.style.cursor = editableRecordFromHit(event) ? 'grab' : ''
      return
    }
    const point = boardPointFromEvent(event)
    if (!point) return
    drag.record.x = rounded(THREE.MathUtils.clamp(
      point.x + drag.offsetX,
      STUDIO_V2_PHOTO_BOARD_COORDINATES.safeMin,
      STUDIO_V2_PHOTO_BOARD_COORDINATES.safeMax,
    ))
    drag.record.y = rounded(THREE.MathUtils.clamp(
      point.y + drag.offsetY,
      STUDIO_V2_PHOTO_BOARD_COORDINATES.safeMin,
      STUDIO_V2_PHOTO_BOARD_COORDINATES.safeMax,
    ))
    applyRecords()
    selectionOutput.textContent = describeSelection(drag.record)
  }
  const onPointerDown = (event) => {
    const record = editableRecordFromHit(event)
    if (!record) return
    const point = boardPointFromEvent(event)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    selected = record
    updateRotationControls(record)
    const stackingChanges = bringStudioV2PhotoRecordToFront(records, record)
    applyRecords()
    saveRecords(stackingChanges, record)
    drag = {
      offsetX: record.x - point.x,
      offsetY: record.y - point.y,
      record,
    }
    domElement.setPointerCapture?.(event.pointerId)
    domElement.style.cursor = 'grabbing'
    selectionOutput.textContent = describeSelection(record)
    setStatus('ADJUSTING · ACTIVE PHOTO IS TOPMOST')
  }
  const finishDrag = (event) => {
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    domElement.releasePointerCapture?.(event.pointerId)
    const currentDrag = drag
    drag = null
    domElement.style.cursor = 'grab'
    saveRecords([currentDrag.record], currentDrag.record)
    setStatus('SAVED LOCALLY · FREE COMPOSITION')
  }
  const onKeyDown = (event) => {
    if (!selected || event.metaKey || event.ctrlKey || event.target === rotationInput) return
    if (event.altKey && !['[', ']'].includes(event.key)) return
    const step = event.shiftKey ? 1 : 0.25
    const rotationStep = event.altKey ? 0.1 : event.shiftKey ? 3 : 1
    let changedRecords = [selected]
    if (event.key === 'ArrowLeft') selected.x -= step
    else if (event.key === 'ArrowRight') selected.x += step
    else if (event.key === 'ArrowUp') selected.y -= step
    else if (event.key === 'ArrowDown') selected.y += step
    else if (event.key === '[') selected.rotation -= rotationStep
    else if (event.key === ']') selected.rotation += rotationStep
    else if (event.key === 'PageUp') changedRecords = bringStudioV2PhotoRecordToFront(records, selected)
    else if (event.key === 'PageDown') changedRecords = moveStudioV2PhotoStackBackward(records, selected)
    else return
    event.preventDefault()
    selected.x = rounded(selected.x)
    selected.y = rounded(selected.y)
    selected.rotation = rounded(selected.rotation, 1)
    applyRecords()
    saveRecords(changedRecords, selected)
    setStatus('SAVED LOCALLY · FREE COMPOSITION')
  }

  const applyRotation = (value) => {
    if (!selected || !Number.isFinite(value)) return false
    selected.rotation = rounded(THREE.MathUtils.clamp(value, -180, 180), 1)
    applyRecords()
    saveRecords([selected], selected)
    setStatus(`ROTATION SAVED · ${selected.rotation.toFixed(1)}°`)
    return true
  }
  const onRotationInput = () => {
    if (!applyRotation(Number(rotationInput.value))) updateRotationControls(selected)
  }
  const rotateBy = (amount) => applyRotation((selected?.rotation ?? 0) + amount)

  const copyPatch = async () => {
    const patch = Object.entries(draft).map(([id, values]) => ({ id, ...values }))
    try {
      await navigator.clipboard.writeText(JSON.stringify(patch, null, 2))
      setStatus(`COPIED ${patch.length} MANIFEST PATCH${patch.length === 1 ? '' : 'ES'}`)
    } catch {
      setStatus('COPY BLOCKED · USE DOWNLOAD MANIFEST', true)
    }
  }
  const downloadManifest = () => {
    const blob = new Blob([`${JSON.stringify(manifestWithDraft(manifest, draft), null, 2)}\n`], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.download = 'photo-wall-manifest-adjusted.json'
    anchor.href = url
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus(`EXPORTED FULL MANIFEST · ${Object.keys(draft).length} CHANGES`)
  }
  const resetDraft = () => {
    editableRecords.forEach((record) => {
      Object.assign(record, originalState[record.id])
    })
    applyRecords()
    draft = {}
    selected = null
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    selectionOutput.textContent = describeSelection(null)
    updateRotationControls(null)
    setStatus('START SNAPSHOT RESTORED')
    updateDataset()
  }
  const togglePanel = () => {
    const minimized = panel.classList.toggle('is-minimized')
    const button = panel.querySelector('[data-action="toggle"]')
    button.textContent = minimized ? 'SHOW' : 'HIDE'
    button.setAttribute('aria-expanded', String(!minimized))
  }
  panel.querySelector('[data-action="toggle"]').addEventListener('click', togglePanel)
  panel.querySelector('[data-action="rotate-down"]').addEventListener('click', () => rotateBy(-1))
  panel.querySelector('[data-action="rotate-up"]').addEventListener('click', () => rotateBy(1))
  rotationInput.addEventListener('input', onRotationInput)
  rotationInput.addEventListener('change', onRotationInput)
  panel.querySelector('[data-action="copy"]').addEventListener('click', copyPatch)
  panel.querySelector('[data-action="download"]').addEventListener('click', downloadManifest)
  panel.querySelector('[data-action="reset"]').addEventListener('click', resetDraft)
  domElement.addEventListener('pointermove', onPointerMove)
  domElement.addEventListener('pointerdown', onPointerDown, true)
  domElement.addEventListener('pointerup', finishDrag, true)
  domElement.addEventListener('pointercancel', finishDrag, true)
  window.addEventListener('keydown', onKeyDown)
  updateDataset()

  return {
    getState: () => ({
      adjustableCount: editableRecords.length,
      baseCount: editableRecords.length - placedNewCount,
      draftCount: Object.keys(draft).length,
      freeComposition: true,
      lockedCount: 0,
      newCount: placedNewCount,
      snapshotReady: true,
      unplacedCount,
    }),
    dispose() {
      domElement.removeEventListener('pointermove', onPointerMove)
      domElement.removeEventListener('pointerdown', onPointerDown, true)
      domElement.removeEventListener('pointerup', finishDrag, true)
      domElement.removeEventListener('pointercancel', finishDrag, true)
      window.removeEventListener('keydown', onKeyDown)
      domElement.style.cursor = ''
      panel.remove()
      delete mount.dataset.photoWallAdjustment
      delete mount.dataset.photoWallAdjustmentEditable
      delete mount.dataset.photoWallAdjustmentLocked
      delete mount.dataset.photoWallAdjustmentDrafts
      delete mount.dataset.photoWallAdjustmentSnapshot
    },
  }
}
