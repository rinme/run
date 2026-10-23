<#
.SYNOPSIS
    Run - GitHub Release Automation Script (PowerShell)
.DESCRIPTION
    Creates or updates a GitHub release using the official GitHub CLI (gh).
.EXAMPLE
    .\scripts\release.ps1 -Tag "v1.2.0"
    .\scripts\release.ps1 -Tag "v1.2.0" -Title "v1.2.0: Run Release" -GenerateNotes
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Tag = "",

    [Parameter(Position = 1)]
    [string]$Title = "",

    [Parameter(Position = 2)]
    [string]$Notes = "",

    [switch]$Draft = $false,
    [switch]$Prerelease = $false,
    [switch]$GenerateNotes = $true,
    [string]$Target = "main"
)

$ErrorActionPreference = "Stop"

# 1. Verify `gh` CLI
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI ('gh') is not installed. Please install it: winget install GitHub.cli"
    exit 1
}

# 2. Determine Tag
if ([string]::IsNullOrWhiteSpace($Tag)) {
    if ($env:TAG_NAME) {
        $Tag = $env:TAG_NAME
    } elseif ($env:INPUT_TAG_NAME) {
        $Tag = $env:INPUT_TAG_NAME
    } elseif ($env:GITHUB_REF_NAME -and $env:GITHUB_REF -like "refs/tags/*") {
        $Tag = $env:GITHUB_REF_NAME
    } elseif (Test-Path "package.json") {
        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
        if ($pkg.version) {
            $Tag = "v" + $pkg.version.TrimStart('v')
            Write-Host "[INFO] Tag derived from package.json: $Tag" -ForegroundColor Cyan
        }
    }
}

if ([string]::IsNullOrWhiteSpace($Tag)) {
    Write-Error "Could not determine release tag. Please provide -Tag v1.2.0"
    exit 1
}

if (-not $Tag.StartsWith("v")) {
    $Tag = "v$Tag"
}

Write-Host "[INFO] Target release tag: $Tag" -ForegroundColor Cyan

# 3. Determine Title
if ([string]::IsNullOrWhiteSpace($Title)) {
    if ($env:RELEASE_TITLE) { $Title = $env:RELEASE_TITLE }
    elseif ($env:INPUT_TITLE) { $Title = $env:INPUT_TITLE }
    else { $Title = "Release $Tag" }
}

# 4. Check if release exists
try {
    $existing = (gh release view $Tag --json tagName -q .tagName 2>$null)
    if ($existing) {
        $url = (gh release view $Tag --json url -q .url 2>$null)
        Write-Host "[WARN] Release for '$Tag' already exists: $url" -ForegroundColor Yellow
        exit 0
    }
} catch {
    # Release does not exist yet
}

# 5. Ensure tag exists
$tagExists = (git tag -l $Tag)
if ([string]::IsNullOrWhiteSpace($tagExists)) {
    Write-Host "[INFO] Creating local git tag $Tag..." -ForegroundColor Cyan
    git tag -a $Tag -m $Title
    try {
        git push origin $Tag
    } catch {
        Write-Host "[WARN] Could not push tag directly; gh will push automatically." -ForegroundColor Yellow
    }
}

# 6. Build arguments
$ghArgs = @("release", "create", $Tag, "--title", $Title)

if ($Draft -or $env:INPUT_DRAFT -eq "true") {
    $ghArgs += "--draft"
}

if ($Prerelease -or $env:INPUT_PRERELEASE -eq "true" -or ($Tag -match "-(alpha|beta|rc|preview)")) {
    $ghArgs += "--prerelease"
}

if (-not [string]::IsNullOrWhiteSpace($Notes)) {
    if (Test-Path $Notes) {
        $ghArgs += @("--notes-file", $Notes)
    } else {
        $ghArgs += @("--notes", $Notes)
    }
} elseif ($GenerateNotes -or $env:INPUT_GENERATE_NOTES -eq "true") {
    $ghArgs += "--generate-notes"
}

if (-not [string]::IsNullOrWhiteSpace($Target)) {
    $ghArgs += @("--target", $Target)
}

# 7. Create release
Write-Host "[INFO] Executing: gh $($ghArgs -join ' ')" -ForegroundColor Cyan
$releaseUrl = & gh @ghArgs

Write-Host "[SUCCESS] GitHub release created: $releaseUrl" -ForegroundColor Green
