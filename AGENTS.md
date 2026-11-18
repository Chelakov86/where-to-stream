# Project workflow

- [Project map](CLAUDE.md#project-structure) and [architecture and coding conventions](CLAUDE.md)
- [Build and test commands](CLAUDE.md#available-scripts) and [Playwright E2E guide](e2e/README.md)
- [GitHub issue workflow](docs/agents/issue-tracker.md)

## Default completion steps

For each implementation task, complete these steps without waiting for the user to repeat them:

1. Read the ticket and verify every acceptance criterion against the implementation and appropriate tests. Record concrete evidence and any remaining limitations; check off only verified criteria.
2. Update the ticket with acceptance status, validation results, and the pull request link. Preserve the original issue context. Keep the issue open while the fix awaits merge.
3. Commit the work on a feature branch, push it, and create or update a pull request linked to the ticket. Include the resulting behavior, acceptance coverage, and relevant validation in the PR description.
4. Review the complete PR diff for correctness, regressions, accessibility, and coverage. At merge review, [reconcile the source issue's criteria with the PR evidence](docs/agents/issue-tracker.md#merge-review), with follow-up links for pending checks. Fix blocking findings and rerun affected checks. Record the review on the PR and label a self-review as such. Check existing review feedback and CI/deployment status.
5. Report the PR link, acceptance status, review outcome, check results, and any remaining blockers. Follow the user's authorized scope for merging; when merged, ensure the ticket and parent tracker reflect completion.

Prefer `gh`. If it is unavailable or an operation fails with a proxy or permission error, use the connected GitHub tools for that operation and mention the fallback. Continue with ticket updates, the PR, and review whenever the available tools support them.
