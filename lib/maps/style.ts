import type { StyleSpecification } from 'maplibre-gl';

/** OpenStreetMap Standard raster tiles with attribution handled by MapLibre. */
export const OSM_STANDARD_STYLE: StyleSpecification = {
  version: 8,
  name: 'OpenStreetMap Standard',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 24,
    },
  ],
};
