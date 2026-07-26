# Contributing

1. Create a focused branch.
2. Run `npm install`.
3. Make changes in the appropriate geometry, core, solver, rendering, or UI
   layer.
4. Add tests for mathematical behavior and regression cases.
5. Run `npm run check` and `npm run benchmark`.

Geometry changes must document tolerance and contact semantics. Solver changes
must remain reproducible when given a seed. A renderer must not become a second
source of geometric truth.
