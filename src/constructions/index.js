export { equilateralRows } from './equilateralRows.js';
export { rightTriangleGrid } from './rightGrid.js';

export const CONSTRUCTION_CATALOG = Object.freeze([
  {
    id: 'right-triangle-rectangular-pairs',
    family: 'right',
    evidence: 'proven_optimal'
  },
  {
    id: 'equilateral-alternating-rows',
    family: 'equilateral',
    evidence: 'verified_construction'
  }
]);
