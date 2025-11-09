<#
.SYNOPSIS
  Run pytest for the project and produce coverage reports (XML and HTML).

.DESCRIPTION
  Removes previous coverage outputs, runs pytest with coverage for the `app`
  package and outputs `server/coverage.xml` and `server/htmlcov/`.

.PARAMETER TestsPath
  Path to tests to run (default: server/tests)

.PARAMETER OpenReport
  If provided, opens the generated HTML report after the run.

.EXAMPLE
  .\scripts\run_tests.ps1

.EXAMPLE
  .\scripts\run_tests.ps1 -TestsPath server/tests/unit -OpenReport
#>

param(
  [string]$TestsPath = "server/tests",
  [switch]$OpenReport
)

try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    Set-Location $scriptDir
} catch {
    # fallback to current dir
}
$covXml = "server/coverage.xml"
$htmlDir = "server/htmlcov"

# Discover repository root (search upwards for pytest.ini or top-level server/ folder)
$cur = $scriptDir
while ($true) {
  if (Test-Path (Join-Path $cur 'pytest.ini') -PathType Leaf -ErrorAction SilentlyContinue) { break }
  if (Test-Path (Join-Path $cur 'server') -PathType Container -ErrorAction SilentlyContinue) { break }
  $parent = Split-Path -Parent $cur
  if ($parent -eq $cur) { break }
  $cur = $parent
}
$repoRoot = $cur

Set-Location $repoRoot

Write-Host "Cleaning previous coverage reports..."
if (Test-Path $htmlDir) { Remove-Item $htmlDir -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path $covXml) { Remove-Item $covXml -Force -ErrorAction SilentlyContinue }

# Resolve TestsPath (allow relative paths passed when script is in server/scripts/)
$resolvedTestsPath = $TestsPath
if (-not (Test-Path $resolvedTestsPath)) {
  $candidate = Join-Path $repoRoot $TestsPath
  $resolved = Resolve-Path -Path $candidate -ErrorAction SilentlyContinue
  if ($resolved) { $resolvedTestsPath = $resolved.Path }
}

Write-Host "Running pytest on '$resolvedTestsPath' with coverage..."
$pytestArgs = @(
  '-q',
  $resolvedTestsPath,
  '--cov=app',
  '--cov-report=term-missing',
  "--cov-report=xml:$covXml",
  "--cov-report=html:$htmlDir"
)

& pytest @pytestArgs
$exit = $LASTEXITCODE

if ($exit -eq 0) {
    Write-Host "\nTests passed. Coverage reports written to:`n - $covXml`n - $htmlDir/index.html" -ForegroundColor Green
} else {
    Write-Host "\nTests failed (exit code $exit). Coverage may be incomplete." -ForegroundColor Red
}

if ($OpenReport.IsPresent) {
    if (Test-Path "$htmlDir\index.html") {
        Write-Host "Opening HTML report..."
        Invoke-Item "$htmlDir\index.html"
    } else {
        Write-Host "HTML report not found." -ForegroundColor Yellow
    }
}

exit $exit
