import { createHash } from 'node:crypto';
import { fromSSS, isInsideBounds, overlaps, transform } from '../geometry/triangle.js';

const DEFAULT_LIMITS = Object.freeze({ maxCandidates: 10_000, maxConflictEdges: 2_000_000 });

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function finitePositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be a positive finite number`);
}

function canonicalNumber(value, quantum) {
  const rounded = Math.round(value / quantum) * quantum;
  return Number((Object.is(rounded, -0) ? 0 : rounded).toPrecision(15));
}

function canonicalPlacement(placement, quantum) {
  return {
    x: canonicalNumber(placement.x, quantum),
    y: canonicalNumber(placement.y, quantum),
    angle: canonicalNumber(placement.angle, quantum),
    reflect: Boolean(placement.reflect)
  };
}

export function finiteDomainDigest(problem, specification, candidates) {
  return createHash('sha256').update(canonicalJson({ problem, specification, candidates })).digest('hex');
}

export function generateFiniteCandidateDomain(problem, specification, limits = {}) {
  const policy = { ...DEFAULT_LIMITS, ...limits };
  finitePositive('problem.width', problem?.width);
  finitePositive('problem.height', problem?.height);
  if (!Array.isArray(problem?.sides) || problem.sides.length !== 3) throw new TypeError('problem.sides must contain three values');
  finitePositive('specification.xStep', specification?.xStep);
  finitePositive('specification.yStep', specification?.yStep);
  finitePositive('specification.quantum', specification?.quantum);
  if (!Array.isArray(specification?.angles) || specification.angles.length === 0 ||
    !specification.angles.every(Number.isFinite)) throw new TypeError('specification.angles must contain finite radians');
  if (!Array.isArray(specification?.reflections) || specification.reflections.length === 0 ||
    !specification.reflections.every(value => typeof value === 'boolean')) {
    throw new TypeError('specification.reflections must contain booleans');
  }
  if (!Number.isInteger(policy.maxCandidates) || policy.maxCandidates <= 0) throw new RangeError('maxCandidates must be positive');

  const shape = fromSSS(...problem.sides);
  const container = { minX: 0, minY: 0, maxX: problem.width, maxY: problem.height };
  const candidates = [];
  const seen = new Set();
  const xCount = Math.floor(problem.width / specification.xStep + 1e-12);
  const yCount = Math.floor(problem.height / specification.yStep + 1e-12);
  for (let xIndex = 0; xIndex <= xCount; xIndex += 1) {
    for (let yIndex = 0; yIndex <= yCount; yIndex += 1) {
      for (const angle of specification.angles) {
        for (const reflect of specification.reflections) {
          const placement = canonicalPlacement({
            x: xIndex * specification.xStep,
            y: yIndex * specification.yStep,
            angle,
            reflect
          }, specification.quantum);
          if (!isInsideBounds(transform(shape, placement), container, specification.quantum)) continue;
          const key = JSON.stringify(placement);
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push(placement);
          if (candidates.length > policy.maxCandidates) throw new RangeError('candidate_limit_exceeded');
        }
      }
    }
  }
  candidates.sort((left, right) =>
    left.x - right.x || left.y - right.y || left.angle - right.angle || Number(left.reflect) - Number(right.reflect));
  const normalizedSpecification = {
    generator: 'cartesian-grid/v1',
    xStep: specification.xStep,
    yStep: specification.yStep,
    angles: [...specification.angles],
    reflections: [...specification.reflections],
    quantum: specification.quantum
  };
  const payload = canonicalJson({ problem, specification: normalizedSpecification, candidates });
  return {
    format: 'tpa-finite-candidate-domain/v1',
    problem: structuredClone(problem),
    specification: normalizedSpecification,
    candidates,
    candidateCount: candidates.length,
    canonicalPayload: payload,
    sha256: createHash('sha256').update(payload).digest('hex')
  };
}

export function buildFiniteConflictGraph(domain, limits = {}) {
  const policy = { ...DEFAULT_LIMITS, ...limits };
  if (domain?.sha256 !== finiteDomainDigest(domain?.problem, domain?.specification, domain?.candidates)) {
    throw new Error('candidate_domain_digest_mismatch');
  }
  if (domain?.canonicalPayload !== canonicalJson({
    problem: domain.problem, specification: domain.specification, candidates: domain.candidates
  })) throw new Error('candidate_domain_payload_mismatch');
  const shape = fromSSS(...domain.problem.sides);
  const transformed = domain.candidates.map(candidate => transform(shape, candidate));
  const adjacency = Array.from({ length: transformed.length }, () => []);
  let edgeCount = 0;
  for (let left = 0; left < transformed.length; left += 1) {
    for (let right = left + 1; right < transformed.length; right += 1) {
      if (!overlaps(transformed[left], transformed[right])) continue;
      adjacency[left].push(right);
      adjacency[right].push(left);
      edgeCount += 1;
      if (edgeCount > policy.maxConflictEdges) throw new RangeError('conflict_edge_limit_exceeded');
    }
  }
  const statement = { domainSha256: domain.sha256, adjacency, edgeCount };
  return {
    format: 'tpa-finite-conflict-graph/v1',
    ...statement,
    sha256: createHash('sha256').update(canonicalJson(statement)).digest('hex')
  };
}

function adjacencySets(graph) {
  return graph.adjacency.map(neighbors => new Set(neighbors));
}

export function solveMaximumIndependentSet(graph, limits = {}) {
  const maxSearchNodes = limits.maxSearchNodes ?? 2_000_000;
  if (!Number.isInteger(maxSearchNodes) || maxSearchNodes <= 0) throw new RangeError('maxSearchNodes must be positive');
  const adjacent = adjacencySets(graph);
  let nodesVisited = 0;
  let best = [];
  const search = (chosen, remaining) => {
    nodesVisited += 1;
    if (nodesVisited > maxSearchNodes) throw new RangeError('independent_set_search_limit_exceeded');
    if (chosen.length + remaining.length <= best.length) return;
    if (remaining.length === 0) {
      if (chosen.length > best.length || (chosen.length === best.length && chosen.join(',') < best.join(','))) {
        best = [...chosen];
      }
      return;
    }
    const vertex = remaining[0];
    search([...chosen, vertex], remaining.slice(1).filter(candidate => !adjacent[vertex].has(candidate)));
    search(chosen, remaining.slice(1));
  };
  search([], graph.adjacency.map((_, index) => index));
  return { selectedIndices: best, optimumLowerBound: best.length, nodesVisited };
}

export function connectedConflictComponents(graph) {
  const seen = new Set();
  const components = [];
  for (let start = 0; start < graph.adjacency.length; start += 1) {
    if (seen.has(start)) continue;
    const pending = [start];
    const component = [];
    seen.add(start);
    while (pending.length > 0) {
      const vertex = pending.pop();
      component.push(vertex);
      for (const neighbor of graph.adjacency[vertex]) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        pending.push(neighbor);
      }
    }
    component.sort((left, right) => left - right);
    components.push(component);
  }
  return components.sort((left, right) => left[0] - right[0]);
}

function inducedConflictGraph(graph, vertices) {
  const localIndex = new Map(vertices.map((vertex, index) => [vertex, index]));
  return {
    adjacency: vertices.map(vertex => graph.adjacency[vertex]
      .filter(neighbor => localIndex.has(neighbor))
      .map(neighbor => localIndex.get(neighbor))
      .sort((left, right) => left - right))
  };
}

export function solveMaximumIndependentSetBitset(graph, limits = {}) {
  const maxSearchNodes = limits.maxSearchNodes ?? 2_000_000;
  if (!Number.isInteger(maxSearchNodes) || maxSearchNodes <= 0) throw new RangeError('maxSearchNodes must be positive');
  const count = graph.adjacency.length;
  const neighborMasks = graph.adjacency.map(neighbors =>
    neighbors.reduce((mask, neighbor) => mask | (1n << BigInt(neighbor)), 0n));
  let nodesVisited = 0;
  let best = [];
  const search = (chosen, remaining) => {
    nodesVisited += 1;
    if (nodesVisited > maxSearchNodes) throw new RangeError('independent_set_search_limit_exceeded');
    if (chosen.length + remaining.toString(2).replaceAll('0', '').length <= best.length) return;
    if (remaining === 0n) {
      if (chosen.length > best.length || (chosen.length === best.length && chosen.join(',') < best.join(','))) best = [...chosen];
      return;
    }
    let vertex = 0;
    let highestDegree = -1;
    for (let candidate = 0; candidate < count; candidate += 1) {
      const bit = 1n << BigInt(candidate);
      if ((remaining & bit) === 0n) continue;
      const degree = (neighborMasks[candidate] & remaining).toString(2).replaceAll('0', '').length;
      if (degree > highestDegree) { vertex = candidate; highestDegree = degree; }
    }
    const vertexBit = 1n << BigInt(vertex);
    search([...chosen, vertex], remaining & ~vertexBit & ~neighborMasks[vertex]);
    search(chosen, remaining & ~vertexBit);
  };
  search([], count === 0 ? 0n : (1n << BigInt(count)) - 1n);
  best.sort((left, right) => left - right);
  return { selectedIndices: best, optimumLowerBound: best.length, nodesVisited };
}

export function solveMinimumCliqueCover(graph, upperLimit, limits = {}) {
  const maxSearchNodes = limits.maxSearchNodes ?? 2_000_000;
  const adjacent = adjacencySets(graph);
  const order = graph.adjacency.map((neighbors, vertex) => ({ vertex, degree: neighbors.length }))
    .sort((left, right) => right.degree - left.degree || left.vertex - right.vertex)
    .map(entry => entry.vertex);
  let nodesVisited = 0;
  let best = null;
  const search = (position, cliques) => {
    nodesVisited += 1;
    if (nodesVisited > maxSearchNodes) throw new RangeError('clique_cover_search_limit_exceeded');
    if (best && cliques.length >= best.length) return;
    if (cliques.length > upperLimit) return;
    if (position === order.length) {
      best = cliques.map(clique => [...clique].sort((a, b) => a - b));
      best.sort((left, right) => left[0] - right[0]);
      return;
    }
    const vertex = order[position];
    for (let index = 0; index < cliques.length; index += 1) {
      if (!cliques[index].every(member => adjacent[vertex].has(member))) continue;
      cliques[index].push(vertex);
      search(position + 1, cliques);
      cliques[index].pop();
    }
    if (cliques.length < upperLimit) {
      cliques.push([vertex]);
      search(position + 1, cliques);
      cliques.pop();
    }
  };
  search(0, []);
  return { cliqueCover: best, optimumUpperBound: best?.length ?? null, nodesVisited };
}

export function solveComponentAwareExact(graph, limits = {}) {
  const components = connectedConflictComponents(graph);
  const selectedIndices = [];
  const cliqueCover = [];
  let independentSetNodes = 0;
  let cliqueCoverNodes = 0;
  for (const vertices of components) {
    const componentGraph = inducedConflictGraph(graph, vertices);
    const remainingBudget = (limits.maxSearchNodes ?? 2_000_000) - independentSetNodes - cliqueCoverNodes;
    if (remainingBudget <= 0) throw new RangeError('component_search_limit_exceeded');
    const independent = solveMaximumIndependentSetBitset(componentGraph, { ...limits, maxSearchNodes: remainingBudget });
    independentSetNodes += independent.nodesVisited;
    const cover = solveMinimumCliqueCover(componentGraph, independent.optimumLowerBound, {
      ...limits,
      maxSearchNodes: (limits.maxSearchNodes ?? 2_000_000) - independentSetNodes - cliqueCoverNodes
    });
    cliqueCoverNodes += cover.nodesVisited;
    if (!cover.cliqueCover || cover.optimumUpperBound !== independent.optimumLowerBound) {
      throw new Error('tight_clique_cover_not_found');
    }
    selectedIndices.push(...independent.selectedIndices.map(index => vertices[index]));
    cliqueCover.push(...cover.cliqueCover.map(clique => clique.map(index => vertices[index])));
  }
  selectedIndices.sort((left, right) => left - right);
  cliqueCover.sort((left, right) => left[0] - right[0]);
  return { components, selectedIndices, cliqueCover, independentSetNodes, cliqueCoverNodes };
}

export function solveFiniteDomainCertificate(domain, graph, limits = {}) {
  if (graph?.domainSha256 !== domain?.sha256) throw new Error('graph_domain_mismatch');
  const result = solveComponentAwareExact(graph, limits);
  const { components, selectedIndices, cliqueCover, independentSetNodes, cliqueCoverNodes } = result;
  const statement = {
    format: 'triangle-packing-certificate/v3',
    type: 'finite_candidate_domain',
    claim: 'optimal_within_declared_finite_candidate_domain',
    globallyOptimal: false,
    domain,
    conflictGraph: graph,
    selectedIndices,
    cliqueCover,
    optimum: selectedIndices.length,
    solver: {
      algorithm: 'component-aware-bitset-branch-and-bound/v1',
      components: components.length,
      componentSizes: components.map(component => component.length),
      independentSetNodes,
      cliqueCoverNodes,
      maxSearchNodes: limits.maxSearchNodes ?? 2_000_000
    }
  };
  const canonicalPayload = canonicalJson(statement);
  return {
    ...statement,
    canonicalPayload,
    sha256: createHash('sha256').update(canonicalPayload).digest('hex')
  };
}

export function verifyFiniteDomainProof(certificate, limits = {}) {
  const errors = [];
  if (certificate?.format !== 'triangle-packing-certificate/v3') errors.push('invalid_certificate_format');
  if (certificate?.claim !== 'optimal_within_declared_finite_candidate_domain' || certificate?.globallyOptimal !== false) {
    errors.push('invalid_claim_boundary');
  }
  let graph;
  try {
    graph = buildFiniteConflictGraph(certificate.domain, limits);
    if (JSON.stringify(graph) !== JSON.stringify(certificate.conflictGraph)) errors.push('conflict_graph_mismatch');
  } catch {
    errors.push('invalid_candidate_domain');
  }
  const selected = certificate?.selectedIndices ?? [];
  const cover = certificate?.cliqueCover ?? [];
  if (graph) {
    const adjacent = adjacencySets(graph);
    const selectedSet = new Set(selected);
    if (selectedSet.size !== selected.length || selected.some(index => !Number.isInteger(index) || !adjacent[index])) {
      errors.push('invalid_selected_indices');
    } else {
      for (let left = 0; left < selected.length; left += 1) {
        for (let right = left + 1; right < selected.length; right += 1) {
          if (adjacent[selected[left]].has(selected[right])) errors.push('selected_conflict');
        }
      }
    }
    const covered = cover.flat();
    if (new Set(covered).size !== graph.adjacency.length || covered.length !== graph.adjacency.length ||
      covered.some(index => !Number.isInteger(index) || !adjacent[index])) errors.push('clique_cover_incomplete');
    for (const clique of cover) {
      for (let left = 0; left < clique.length; left += 1) {
        for (let right = left + 1; right < clique.length; right += 1) {
          if (!adjacent[clique[left]].has(clique[right])) errors.push('invalid_clique_edge');
        }
      }
    }
  }
  if (selected.length !== cover.length || certificate?.optimum !== selected.length) errors.push('upper_lower_bound_mismatch');
  const { sha256, canonicalPayload, ...statement } = certificate ?? {};
  if (canonicalPayload !== canonicalJson(statement) ||
    sha256 !== createHash('sha256').update(canonicalPayload ?? '').digest('hex')) errors.push('certificate_digest_mismatch');
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    scope: 'declared_finite_candidate_domain_only',
    optimum: errors.length === 0 ? selected.length : null,
    globallyOptimal: false
  };
}
