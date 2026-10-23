#!/usr/bin/env bash
# ==============================================================================
# Run — GitHub Release Automation Script
# Usage:
#   ./scripts/release.sh [TAG] [TITLE] [NOTES]
#
# Environment Variables (Optional):
#   TAG_NAME             Tag to create/release (e.g., v1.2.0)
#   RELEASE_TITLE        Custom title for the release
#   RELEASE_NOTES        Custom notes or markdown file path
#   GENERATE_NOTES       Set to "true" to auto-generate from commits/PRs (default: true)
#   IS_DRAFT             Set to "true" to create as a draft (default: false)
#   IS_PRERELEASE        Set to "true" or "false" (auto-detected if tag has suffix)
#   TARGET_COMMITISH     Target branch/commit (default: main or current HEAD)
#   GH_TOKEN             GitHub Token (automatically provided in GitHub Actions)
# ==============================================================================

set -euo pipefail

# Text formatters
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Verify `gh` CLI is installed
if ! command -v gh &> /dev/null; then
  log_error "GitHub CLI ('gh') is not installed or not in PATH."
  echo "Please install it: https://cli.github.com/ or run 'winget install GitHub.cli' / 'brew install gh'"
  exit 1
fi

# Ensure token is exported if GITHUB_TOKEN is set in Actions
if [ -n "${GITHUB_TOKEN:-}" ] && [ -z "${GH_TOKEN:-}" ]; then
  export GH_TOKEN="${GITHUB_TOKEN}"
fi

# Verify gh authentication
if ! gh auth status &> /dev/null; then
  log_error "GitHub CLI is not authenticated. Please run 'gh auth login' or export GH_TOKEN."
  exit 1
fi

# 2. Determine Tag Name
# Precedence: Argument 1 -> $TAG_NAME -> $INPUT_TAG_NAME -> $GITHUB_REF_NAME (if tag) -> package.json
TAG="${1:-${TAG_NAME:-${INPUT_TAG_NAME:-}}}"

if [ -z "$TAG" ]; then
  if [ -n "${GITHUB_REF_NAME:-}" ] && [[ "${GITHUB_REF:-}" == refs/tags/* ]]; then
    TAG="${GITHUB_REF_NAME}"
  fi
fi

if [ -z "$TAG" ]; then
  # Fallback: extract version from package.json using node or bun or grep
  if [ -f "package.json" ]; then
    PKG_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || grep -m1 '"version"' package.json | sed -E 's/.*"version": "([^"]+)".*/\1/')
    if [ -n "$PKG_VERSION" ]; then
      TAG="v${PKG_VERSION#v}"
      log_info "No tag specified. Derived from package.json: ${BOLD}${TAG}${NC}"
    fi
  fi
fi

if [ -z "$TAG" ]; then
  log_error "Could not determine release tag. Please pass as argument: ./scripts/release.sh v1.2.0"
  exit 1
fi

# Ensure tag has 'v' prefix
if [[ ! "$TAG" =~ ^v ]]; then
  TAG="v${TAG}"
fi

log_info "Target release tag: ${BOLD}${TAG}${NC}"

# 3. Determine Title
TITLE="${2:-${RELEASE_TITLE:-${INPUT_TITLE:-}}}"
if [ -z "$TITLE" ]; then
  TITLE="Release ${TAG}"
fi

# 4. Check Pre-release and Draft settings
IS_PRERELEASE="${IS_PRERELEASE:-${INPUT_PRERELEASE:-}}"
if [ -z "$IS_PRERELEASE" ]; then
  # Auto-detect prerelease suffix (e.g. v1.2.0-rc.1, v1.2.0-beta)
  if [[ "$TAG" =~ -(alpha|beta|rc|canary|next|preview) ]]; then
    IS_PRERELEASE="true"
  else
    IS_PRERELEASE="false"
  fi
fi

IS_DRAFT="${IS_DRAFT:-${INPUT_DRAFT:-false}}"
GENERATE_NOTES="${GENERATE_NOTES:-${INPUT_GENERATE_NOTES:-true}}"
CUSTOM_NOTES="${3:-${RELEASE_NOTES:-}}"

# 5. Check if release already exists on GitHub
EXISTING_RELEASE=$(gh release view "$TAG" --json tagName -q .tagName 2>/dev/null || true)
if [ -n "$EXISTING_RELEASE" ]; then
  log_warn "Release for tag '${TAG}' already exists on GitHub."
  RELEASE_URL=$(gh release view "$TAG" --json url -q .url)
  log_info "Existing release URL: ${RELEASE_URL}"
  
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "release_url=${RELEASE_URL}" >> "$GITHUB_OUTPUT"
    echo "tag_name=${TAG}" >> "$GITHUB_OUTPUT"
    echo "already_existed=true" >> "$GITHUB_OUTPUT"
  fi
  exit 0
fi

# 6. Ensure git tag exists locally or will be created
if [ -z "$(git tag -l "$TAG")" ]; then
  log_info "Git tag '${TAG}' does not exist locally. Creating tag pointing to HEAD..."
  git tag -a "$TAG" -m "${TITLE}"
  
  # Push tag if we have push permissions
  if git remote get-url origin >/dev/null 2>&1; then
    log_info "Pushing tag '${TAG}' to origin..."
    git push origin "$TAG" || log_warn "Could not push tag directly; gh release create will attempt to tag automatically."
  fi
fi

# 7. Build GH Release arguments
GH_ARGS=("$TAG")
GH_ARGS+=("--title" "$TITLE")

if [ "$IS_DRAFT" = "true" ]; then
  GH_ARGS+=("--draft")
  log_info "Option: Create as draft"
fi

if [ "$IS_PRERELEASE" = "true" ]; then
  GH_ARGS+=("--prerelease")
  log_info "Option: Mark as pre-release"
fi

if [ -n "$CUSTOM_NOTES" ]; then
  if [ -f "$CUSTOM_NOTES" ]; then
    GH_ARGS+=("--notes-file" "$CUSTOM_NOTES")
    log_info "Option: Using notes from file: ${CUSTOM_NOTES}"
  else
    GH_ARGS+=("--notes" "$CUSTOM_NOTES")
    log_info "Option: Using custom notes string"
  fi
elif [ "$GENERATE_NOTES" = "true" ]; then
  GH_ARGS+=("--generate-notes")
  log_info "Option: Automatically generating notes from commit history"
fi

# Set target branch if defined
TARGET_BRANCH="${TARGET_COMMITISH:-main}"
if [ -n "$TARGET_BRANCH" ]; then
  GH_ARGS+=("--target" "$TARGET_BRANCH")
fi

# 8. Execute GitHub Release creation
log_info "Creating GitHub release via gh CLI..."
RELEASE_URL=$(gh release create "${GH_ARGS[@]}")

log_success "GitHub release created successfully!"
log_success "Release URL: ${BOLD}${RELEASE_URL}${NC}"

# 9. Set outputs for GitHub Actions workflows if running in CI
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "release_url=${RELEASE_URL}" >> "$GITHUB_OUTPUT"
  echo "tag_name=${TAG}" >> "$GITHUB_OUTPUT"
  echo "already_existed=false" >> "$GITHUB_OUTPUT"
fi
