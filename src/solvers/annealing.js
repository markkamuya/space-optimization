import { createRandom } from '../core/random.js';
import { packOrder } from './compact.js';
import { solveGreedy } from './greedy.js';

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
  let best = baseline;
  const history = [{ iteration: 0, score: best.metrics.score }];

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    if (options.signal?.aborted) throw new DOMException('Solver cancelled', 'AbortError');
    const order = shuffledOrder(problem.triangles.length, random);
    const phase = random();
    const packed = packOrder(problem, order, { phase });
    if (packed?.metrics.valid && packed.metrics.score < best.metrics.score) {
      best = { ...packed, solver: 'multi-start' };
    }

    history.push({ iteration, score: best.metrics.score });
    options.onProgress?.({
      iteration,
      iterations,
      state: best.state,
      metrics: best.metrics
    });
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return {
    solver: 'multi-start',
    state: best.state,
    metrics: best.metrics,
    iterations,
    elapsedMs: performance.now() - started,
    history,
    baseline
  };
}
