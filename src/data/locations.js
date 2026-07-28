/**
 * @typedef {'origin' | 'stage' | 'current'} FootprintBaseRole
 *
 * @typedef {Object} FootprintBaseLocation
 * @property {string} id
 * @property {string} city
 * @property {number} latitude
 * @property {number} longitude
 * @property {FootprintBaseRole} role
 */

/** @type {FootprintBaseLocation[]} */
export const footprintBaseLocations = [
  {
    id: 'huizhou',
    city: 'Huizhou',
    latitude: 23.1115,
    longitude: 114.4152,
    role: 'origin',
  },
  {
    id: 'changchun',
    city: 'Changchun',
    latitude: 43.8171,
    longitude: 125.3235,
    role: 'stage',
  },
  {
    id: 'kuala-lumpur',
    city: 'Kuala Lumpur',
    latitude: 3.139,
    longitude: 101.6869,
    role: 'current',
  },
]

export const footprintBaseLocationsById = new Map(
  footprintBaseLocations.map((location) => [location.id, location]),
)
