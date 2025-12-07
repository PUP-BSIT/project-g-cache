# Layer 4 — Build & Security

Purpose
- Ensure reproducible, fast builds and enforce security gates (vulnerability scanning, SBOM, signing) before artifacts are published.

What belongs in Layer 4
- Production build (repeatable, cached): multi-stage Docker builds, language-specific build outputs (ng build, mvn package).
- Image hardening & minimization: use distroless or slim base images, remove build-time tools in final stage.
- Vulnerability scanning: run Trivy or similar against built images and fail the job on policy violations.
- SBOM generation: produce an SBOM (e.g., Syft) and upload it as a CI artifact.
- Image signing and attestation: sign images with `cosign` and store signatures alongside registry artifacts.
- Artifact publishing: push images to the registry only after passing policy gates.

CI job checklist (high level)
- Checkout code.
- Build artifacts (frontend `ng build --configuration production`; backend `mvn -DskipTests package`).
- Build Docker images (multi-stage) and tag with `sha` and `latest` as appropriate.
- Generate SBOM: `syft packages -o cyclonedx docker:image:tag > sbom.cdx` and upload as artifact.
- Scan images: `trivy image --exit-code 1 --severity HIGH,CRITICAL image:tag` (fail on policy breaches).
- Sign images: `cosign sign --key $COSIGN_KEY <registry>/app:sha` or use OIDC-based signing.
- Push images to registry only on successful scan/sign steps.

Example GitHub Actions job snippet (concept)
```
jobs:
  build-and-secure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build backend
        run: mvn -DskipTests package -DskipITs --batch-mode
      - name: Build frontend
        run: npm ci && npm run build --if-present
      - name: Build Docker images
        run: docker build -t $REGISTRY/backend:$SHORT_SHA ./pomodify-backend && docker build -t $REGISTRY/frontend:$SHORT_SHA ./pomodify-frontend
      - name: Generate SBOMs
        run: syft packages docker:$REGISTRY/backend:$SHORT_SHA -o cyclonedx > backend-sbom.cdx
      - name: Scan images
        run: trivy image --exit-code 1 --severity HIGH,CRITICAL $REGISTRY/backend:$SHORT_SHA
      - name: Sign images
        run: cosign sign --key $COSIGN_KEY $REGISTRY/backend:$SHORT_SHA
      - name: Push images
        run: docker push $REGISTRY/backend:$SHORT_SHA
```

Practical policy suggestions
- Fail CI on any CRITICAL or HIGH vulnerabilities unless a documented exception exists.
- Keep a short-lived allowlist for false-positives and re-scan after dependency upgrades.
- Require signed images for production deploys.

Runtime expectations
- SBOM generation + Trivy scan per image: ~30–90s depending on cache and runner.
- cosign signing: a few seconds.
- Overall layer runtime: typically 1–4 minutes for a cached build on GitHub-hosted runners.

Where this was documented before
- Layer 4 guidance was summarized inside `CI_CD_PIPELINE_PLAN.md` and `IMPLEMENTATION_CHECKLIST.md`; the separate `LAYER_4_BUILD_AND_SECURITY.md` file was not present earlier. This file extracts and expands that material into its own focused reference.

Next steps to adopt
- Add `syft`, `trivy`, and `cosign` steps to `.github/workflows/ci.yml` after the build stage.
- Add GitHub Secrets: `REGISTRY_TOKEN`, `COSIGN_KEY` (or configure OIDC).
- Add gating: block `main` merges for failing build-and-secure job.

References
- Trivy: https://github.com/aquasecurity/trivy
- Syft: https://github.com/anchore/syft
- Cosign: https://github.com/sigstore/cosign
