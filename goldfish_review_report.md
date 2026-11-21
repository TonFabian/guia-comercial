# Goldfish Review Report

**Target:** `docs/superpowers/plans/2026-11-21-clean-code-refactor-plan.md`

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `implementation_readiness` | completed |
| `codebase_details` | completed |

## Prioritized Findings (Blockers -> Major -> Nits)

### Task 3 is already implemented — duplicate/no-op — Severity: Major
* **Reviewer Lens:** `implementation_readiness`
* **Affected Scope:** Task 3 (useHomeData cancellation)
* **Discrepancy Description**: `use-home-data.ts` already contains `let cancelled = false`, cleanup returning `cancelled = true`, and `if (cancelled) return` guards at setState sites (lines 57, 73, 85, 126-129). Executing the task as written yields no diff; the implementer has nothing to do.
* **Rationale & Recommendation**: Re-scope Task 3 to a genuine gap — e.g., add `AbortController` to the underlying fetch in `api.ts`, or remove the task and note cancellation as already satisfied. Verify via grep that no unguarded setState remains.

### CompanyDataSource interface is incomplete — Severity: Major
* **Reviewer Lens:** `implementation_readiness`
* **Affected Scope:** Task 5 (Adapter for data sources)
* **Discrepancy Description**: Declared interface only has `getFeatured(): Promise<Company[]>`, but `api.ts` exposes many endpoints (getCategories, getBanners, getCoupons, getJobs, getPharmacyOnDuty, etc.). Scope of migration is undefined.
* **Rationale & Recommendation**: Define the full interface set and a migration plan (which endpoints move now vs. later), or explicitly scope the adapter to featured-companies only with a follow-up task.

### PlanStrategy feature set is stringly-typed — Severity: Major
* **Reviewer Lens:** `implementation_readiness`
* **Affected Scope:** Task 4 (Strategy for plans)
* **Discrepancy Description**: `hasFeature(f: string)` has no enumerated feature set and no source of truth for valid feature names. Test only asserts premium/catalog.
* **Rationale & Recommendation**: Define a union/enum of features, map per plan, and add tests for all plans (Free/Basic/Premium) and all features.

### Task 1 lacks behavioral verification — Severity: Major
* **Reviewer Lens:** `implementation_readiness`
* **Affected Scope:** Task 1 (memoize makeStyles)
* **Discrepancy Description**: Only typecheck is required; memoization can change style identity used in `renderItem`/`React.memo` comparisons.
* **Rationale & Recommendation**: Run the full test suite and, where feasible, assert list items do not re-render unnecessarily. Also ensure both `makeStyles` call sites in `company-detail-screen.tsx` (lines 69 and 130) are memoized.

### Task 2 missing snapToInterval formula — Severity: Nit
* **Reviewer Lens:** `implementation_readiness`
* **Affected Scope:** Task 2 (useCarouselPagination)
* **Discrepancy Description**: `snapToInterval` calculation is not specified; implementer must infer.
* **Rationale & Recommendation**: Add the formula (e.g., `itemWidth + spacing`) to the interface contract.

### Task 6/8 are "Verify" tasks with loose criteria — Severity: Nit
* **Reviewer Lens:** `implementation_readiness`
* **Affected Scope:** Tasks 6 and 8
* **Discrepancy Description**: Acceptance criteria are vague ("diff", "confirm grep"). Task 8's grep command and test exclusions are already documented in AGENTS §12.1.
* **Rationale & Recommendation**: Name expected zero-diff for Task 6 and the exact CI step/command for Task 8.

### company-detail-screen.tsx has two makeStyles call sites — Severity: Nit
* **Reviewer Lens:** `codebase_details`
* **Affected Scope:** Task 1
* **Discrepancy Description**: `company-detail-screen.tsx` calls `makeStyles(colors)` at lines 69 and 130; both need memoization, not just one.
* **Rationale & Recommendation**: Ensure both call sites are covered in the task scope.
