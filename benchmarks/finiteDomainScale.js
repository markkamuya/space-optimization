import { performance } from 'node:perf_hooks';
import {
  solveComponentAwareExact,
  solveMaximumIndependentSet
} from '../src/research/finiteDomain.js';

function disconnectedCliques(componentCount, componentSize) {
  const count = componentCount * componentSize;
  return {
    adjacency: Array.from({ length: count }, (_, vertex) => {
      const start = Math.floor(vertex / componentSize) * componentSize;
      return Array.from({ length: componentSize }, (_, offset) => start + offset)
        .filter(candidate => candidate !== vertex);
    })
  };
}

const graph = disconnectedCliques(8, 4);
const legacyStarted = performance.now();
const legacy = solveMaximumIndependentSet(graph, { maxSearchNodes: 2_000_000 });
const legacyMs = performance.now() - legacyStarted;
const componentStarted = performance.now();
const componentAware = solveComponentAwareExact(graph, { maxSearchNodes: 2_000_000 });
const componentMs = performance.now() - componentStarted;
const componentNodes = componentAware.independentSetNodes + componentAware.cliqueCoverNodes;
const report = {
  format: 'tpa-finite-domain-scale-benchmark/v1',
  candidates: graph.adjacency.length,
  components: componentAware.components.length,
  optimum: componentAware.selectedIndices.length,
  legacyNodes: legacy.nodesVisited,
  componentAwareNodes: componentNodes,
  nodeReduction: Number((legacy.nodesVisited / componentNodes).toFixed(2)),
  legacyMs: Number(legacyMs.toFixed(2)),
  componentAwareMs: Number(componentMs.toFixed(2)),
  passes: legacy.optimumLowerBound === componentAware.selectedIndices.length &&
    componentAware.cliqueCover.length === componentAware.selectedIndices.length &&
    componentNodes < legacy.nodesVisited / 5
};
console.log(JSON.stringify(report, null, 2));
if (!report.passes) process.exitCode = 1;
