# Submit your first record

1. Copy `atlas/submissions/template.json` into the matching family directory.
2. Give the record a stable kebab-case id.
3. Describe one normalized triangle type, the rectangle, and every placement in
   exact floating-point coordinates.
4. Set evidence to `candidate`; only reviewers promote proof or publication
   states.
5. Run:

   ```sh
   npm run atlas:submission -- atlas/family/your-record.json
   npm run atlas:report -- atlas/family/your-record.json report.svg
   ```

6. Open a pull request. The automated check repeats structural validation,
   geometry verification, fingerprint matching, record comparison, and visual
   report generation.
7. Respond to reviewer questions about normalization, solver budget,
   provenance, or citations.

A valid candidate is not automatically a new record. It must describe a new
problem or improve the verified piece count/density for a comparable problem.
Proof and citation claims always require human review.
