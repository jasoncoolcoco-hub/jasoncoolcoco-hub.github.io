const STACK_ORDER_PRECISION = 6

export function compareStudioV2PhotoStack(left, right) {
  const depthDifference = left.zOrder - right.zOrder
  if (Math.abs(depthDifference) > 1e-9) return depthDifference
  const slotDifference = (left.slotNumber ?? 0) - (right.slotNumber ?? 0)
  if (slotDifference) return slotDifference
  return String(left.id).localeCompare(String(right.id))
}

function cardCorners(card, { boardHeight, boardWidth, cardScale }) {
  const radians = card.rotation * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const centerX = (50 - card.x) / 100 * boardWidth
  const centerY = (50 - card.y) / 100 * boardHeight
  const halfWidth = card.width * cardScale / 2
  const halfHeight = card.height * cardScale / 2
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ].map(([x, y]) => [
    centerX + x * cosine - y * sine,
    centerY + x * sine + y * cosine,
  ])
}

function projectionRange(points, axisX, axisY) {
  const projections = points.map(([x, y]) => x * axisX + y * axisY)
  return [Math.min(...projections), Math.max(...projections)]
}

export function studioV2PhotoCardsOverlap(left, right, options) {
  const leftCorners = cardCorners(left, options)
  const rightCorners = cardCorners(right, options)
  for (const corners of [leftCorners, rightCorners]) {
    for (let index = 0; index < corners.length; index += 1) {
      const current = corners[index]
      const next = corners[(index + 1) % corners.length]
      const axisX = -(next[1] - current[1])
      const axisY = next[0] - current[0]
      const [leftMin, leftMax] = projectionRange(leftCorners, axisX, axisY)
      const [rightMin, rightMax] = projectionRange(rightCorners, axisX, axisY)
      if (leftMax <= rightMin + 1e-9 || rightMax <= leftMin + 1e-9) return false
    }
  }
  return true
}

export function resolveStudioV2PhotoDepthRanks(records, options) {
  const ordered = [...records].sort(compareStudioV2PhotoStack)
  const ranks = new Map()
  const overlappingPairs = []
  ordered.forEach((record, index) => {
    let rank = 0
    for (let lowerIndex = 0; lowerIndex < index; lowerIndex += 1) {
      const lower = ordered[lowerIndex]
      if (!studioV2PhotoCardsOverlap(lower, record, options)) continue
      rank = Math.max(rank, (ranks.get(lower.id) ?? 0) + 1)
      overlappingPairs.push(Object.freeze({ lowerId: lower.id, upperId: record.id }))
    }
    ranks.set(record.id, rank)
  })
  return Object.freeze({
    maximumRank: Math.max(0, ...ranks.values()),
    overlappingPairs: Object.freeze(overlappingPairs),
    ranks,
  })
}

function applyNormalizedOrder(records, ordered) {
  const changed = []
  const denominator = Math.max(1, ordered.length - 1)
  ordered.forEach((record, index) => {
    const nextZOrder = Number((index / denominator).toFixed(STACK_ORDER_PRECISION))
    if (Math.abs(record.zOrder - nextZOrder) <= 1e-9) return
    record.zOrder = nextZOrder
    changed.push(record)
  })
  return changed
}

export function bringStudioV2PhotoStackToFront(records, target) {
  const ordered = [...records]
    .filter((record) => record.id !== target.id)
    .sort(compareStudioV2PhotoStack)
  ordered.push(target)
  return applyNormalizedOrder(records, ordered)
}

export function moveStudioV2PhotoStackBackward(records, target) {
  const ordered = [...records].sort(compareStudioV2PhotoStack)
  const index = ordered.findIndex((record) => record.id === target.id)
  if (index <= 0) return []
  ;[ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]]
  return applyNormalizedOrder(records, ordered)
}
