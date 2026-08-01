/**
 * @typedef {'origin' | 'stage' | 'current'} FootprintBaseRole
 *
 * @typedef {Object} FootprintBaseLocation
 * @property {string} id
 * @property {string} city
 * @property {number} latitude
 * @property {number} longitude
 * @property {FootprintBaseRole} role
 * @property {string} timeRange
 */

/** @type {FootprintBaseLocation[]} */
export const footprintBaseLocations = [
  {
    id: 'huizhou',
    city: 'Huizhou',
    displayName: 'Huizhou',
    displayNameZh: '惠州',
    latitude: 23.1115,
    longitude: 114.4152,
    role: 'origin',
    timeRange: '2000–2018',
  },
  {
    id: 'changchun',
    city: 'Changchun',
    displayName: 'Changchun',
    displayNameZh: '长春',
    latitude: 43.8171,
    longitude: 125.3235,
    role: 'stage',
    timeRange: '2018–2022',
  },
  {
    id: 'kuala-lumpur',
    city: 'Kuala Lumpur',
    displayName: 'Kuala Lumpur',
    displayNameZh: '吉隆坡',
    latitude: 3.139,
    longitude: 101.6869,
    role: 'current',
    timeRange: '2022–PRESENT',
  },
]

export const footprintBaseLocationsById = new Map(
  footprintBaseLocations.map((location) => [location.id, location]),
)
