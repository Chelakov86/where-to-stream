# Project workflow

Read [CLAUDE.md](CLAUDE.md) for architecture, coding conventions, and test commands.
Use [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) for GitHub issue conventions.

## Default completion steps

For each implementation task, complete these steps without waiting for the user to repeat them:

1. Read the ticket and verify every acceptance criterion against the implementation and appropriate tests. Record concrete evidence and any remaining limitations; check off only verified criteria.
2. Update the ticket with acceptance status, validation results, and the pull request link. Preserve the original issue context. Keep the issue open while the fix awaits merge.
3. Commit the work on a feature branch, push it, and create or update a pull request linked to the ticket. Include the resulting behavior, acceptance coverage, and relevant validation in the PR description.
4. Review the complete PR diff for correctness, regressions, accessibility, and coverage. Fix blocking findings and rerun affected checks. Record the review on the PR, clearly identifying a self-review when applicable; do not present it as independent approval. Check existing review feedback and CI/deployment status.
5. Report the PR link, acceptance status, review outcome, check results, and any remaining blockers. Follow the user's authorized scope for merging; when merged, ensure the ticket and parent tracker reflect completion.

Prefer the GitHub CLI. If it is unavailable or denied, use the connected GitHub tools and mention the fallback. Do not stop at local implementation when ticket updates, a PR, and code review can be completed.
