import { createRandom } from '../core/random.js';
import { packOrder } from './compact.js';
import { expandedFillProblem, solveGreedy } from './greedy.js';

function shuffledOrder(length, random) {
  const order = Array.from({ length }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

// Kept under the original export name for API compatibility. The implementation
// is now a valid-only, multi-start constructive search rather than annealing.
export async function solveAnnealing(problem, options = {}) {
  const started = performance.now();
  const requested = Number(options.iterations ?? 120);
  const iterations = Math.max(1, Math.min(300, requested));
  const random = createRandom(options.seed ?? problem.seed);
  const baseline = options.initial ?? solveGreedy(problem);
  if (baseline.solver === 'lattice-fill') {
    options.onProgress?.({
      iteration: 1,
      iterations: 1,
      state: baseline.state,
      metrics: baseline.metrics,
      problem: baseline.problem
    });
    return {
      ...baseline,
      solver: 'lattice-fill',
      iterations: 1,
      history: [
        { iteration: 0, score: baseline.metrics.score },
        { iteration: 1, score: baseline.metrics.score }
      ],
      baseline
    };
  }
  const packingProblem = expandedFillProblem(problem);
  let best = baseline;
  const history = [{ iteration: 0, score: best.metrics.score }];

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    if (options.signal?.aborted) throw new DOMException('Solver cancelled', 'AbortError');
    const order = shuffledOrder(packingProblem.triangles.length, random);
    const phase = random();
    const packed = packOrder(packingProblem, order, {
      phase,
      allowPartial: problem.fillSheet
    });
    const betterFill = problem.fillSheet &&
      packed?.metrics.valid &&
      (packed.metrics.triangleArea > best.metrics.triangleArea + 1e-7 ||
        (Math.abs(packed.metrics.triangleArea - best.metrics.triangleArea) <= 1e-7 &&
          packed.metrics.score < best.metrics.score));
    const betterFixed = !problem.fillSheet && packed?.metrics.valid &&
      packed.metrics.score < best.metrics.score;
    if (betterFill || betterFixed) {
      best = { ...packed, solver: 'multi-start' };
    }

    history.push({ iteration, score: best.metrics.score });
    options.onProgress?.({
      iteration,
      iterations,
      state: best.state,
      metrics: best.metrics,
      problem: best.problem
    });
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return {
    solver: 'multi-start',
    problem: best.problem,
    state: best.state,
    metrics: best.metrics,
    iterations,
    elapsedMs: performance.now() - started,
    history,
    baseline
  };
}
