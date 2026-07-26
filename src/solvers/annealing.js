import { createRandom } from '../core/random.js';
import { evaluate } from './scoring.js';
import { solveGreedy } from './greedy.js';

function copyState(state) {
  return state.map(item => ({ ...item }));
}

export async function solveAnnealing(problem, options = {}) {
  const started = performance.now();
  const iterations = Number(options.iterations ?? 12000);
  const random = createRandom(options.seed ?? problem.seed);
  const baseline = options.initial ?? solveGreedy(problem);
  let current = copyState(baseline.state);
  let currentMetrics = evaluate(problem, current);
  let best = copyState(current);
  let bestMetrics = currentMetrics;
  const history = [{ iteration: 0, score: bestMetrics.score }];
  const translationScale = Math.max(problem.width, problem.height) * 0.12;

  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    if (options.signal?.aborted) throw new DOMException('Solver cancelled', 'AbortError');
    const progress = iteration / iterations;
    const temperature = Math.max(0.001, 1 - progress);
    const next = copyState(current);
    const index = Math.floor(random() * next.length);
    if (problem.allowRotation && random() < 0.35) {
      next[index].angle += (random() - 0.5) * Math.PI * temperature;
    } else if (problem.allowReflection && random() < 0.08) {
      next[index].reflect = !next[index].reflect;
    } else {
      next[index].x += (random() - 0.5) * translationScale * temperature;
      next[index].y += (random() - 0.5) * translationScale * temperature;
    }

    const nextMetrics = evaluate(problem, next);
    const delta = nextMetrics.score - currentMetrics.score;
    const scale = Math.max(1, currentMetrics.score);
    if (delta <= 0 || random() < Math.exp(-delta / (scale * temperature * 0.05))) {
      current = next;
      currentMetrics = nextMetrics;
    }
    if (nextMetrics.score < bestMetrics.score) {
      best = copyState(next);
      bestMetrics = nextMetrics;
    }

    if (iteration % Math.max(1, Math.floor(iterations / 100)) === 0) {
      history.push({ iteration, score: bestMetrics.score });
      options.onProgress?.({ iteration, iterations, state: best, metrics: bestMetrics });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return {
    solver: 'annealing',
    state: best,
    metrics: bestMetrics,
    iterations,
    elapsedMs: performance.now() - started,
    history,
    baseline
  };
}
