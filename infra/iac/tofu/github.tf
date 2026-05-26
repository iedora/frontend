# GitHub repo configuration — empty by design.
#
# This file USED to push `github_actions_variable` and
# `github_actions_secret` resources to reconcile the repo's CI inputs.
# Both went away because they were chicken-egg:
#
#  - `BWS_ACCESS_TOKEN` (only true bootstrap credential) and
#    `IAC_BOOTSTRAP_SSH_PRIVATE_KEY` were Tofu-written secrets that the
#    CI workflow needed BEFORE Tofu could run. After every `tofu
#    destroy`, the secrets vanished and CI couldn't authenticate to
#    apply them back. → `BWS_ACCESS_TOKEN` is now operator-managed via
#    `gh secret set` (one-time, survives destroy). The SSH key lives
#    only in BWS; each workflow hydrates it inline.
#
#  - `BWS_PROJECT_ID`, `CLOUDFLARE_ACCOUNT_ID`, `MENU_PUBLIC_HOSTNAME`
#    were Tofu-written variables that the CI workflow read as env
#    vars. All three are auto-derivable by `bin/iedora-env`
#    (BWS project list, CF /accounts API, Tofu variable default). No
#    reason to round-trip through GH Actions variables.
#
# The `integrations/github` provider stays in `versions.tf` for
# possible future use — declarative branch protection, codeowners,
# webhook config — but no resources today.
#
# Branch protection: deliberately absent. See docs/deploy.md / memory
# `project_branch_protection.md` — solo, AI-driven, CI is the signal.
# Revisit when adding collaborators.
