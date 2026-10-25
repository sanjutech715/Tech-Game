$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$serverPort = if ($env:PORT) { [int]$env:PORT } else { 3001 }
$studentUrl = "http://127.0.0.1:$serverPort/"
$adminUrl = "http://127.0.0.1:$serverPort/admin"
$existingResponse = $null

try {
    $existingResponse = Invoke-WebRequest -Uri $studentUrl -TimeoutSec 2 -UseBasicParsing
}
catch {
    if ($_.Exception.Response) {
        throw
    }
}

if ($existingResponse) {
    if ($existingResponse.Content -notmatch 'Chicken Road Rush') {
        throw "Port $serverPort is already serving a different application."
    }
    Start-Process $adminUrl
    Write-Output "Chicken Road Rush is already running. Students: http://localhost:$serverPort"
    exit 0
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source }

if (-not $nodeExecutable) {
    $architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
    $platform = switch ($architecture) {
        'X64' { 'win-x64' }
        'Arm64' { 'win-arm64' }
        default { throw "Automatic Node.js setup does not support this Windows architecture: $architecture" }
    }

    $runtimeRoot = Join-Path $env:LOCALAPPDATA 'ChickenRoadRush'
    if (Test-Path -LiteralPath $runtimeRoot -PathType Container) {
        $cachedNode = Get-ChildItem -LiteralPath $runtimeRoot -Filter 'node.exe' -File -Recurse |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        if ($cachedNode) {
            $nodeExecutable = $cachedNode.FullName
            Write-Output "Using cached Node.js at $nodeExecutable."
        }
    }

    if (-not $nodeExecutable) {
        Write-Output 'Node.js was not found. Setting up the portable Node.js LTS runtime...'
        $releases = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
        $release = $null
        foreach ($candidate in $releases) {
            if ($candidate.lts -and ($candidate.files -contains "$platform-zip")) {
                $release = $candidate
                break
            }
        }

        if (-not $release) {
            throw "Could not find a supported Node.js LTS release for $platform."
        }

        $version = $release.version
        $archiveName = "node-$version-$platform.zip"
        $nodeDirectory = Join-Path $runtimeRoot "node-$version-$platform"
        $nodeExecutable = Join-Path $nodeDirectory 'node.exe'

        if (-not (Test-Path -LiteralPath $nodeExecutable -PathType Leaf)) {
            New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
            $archivePath = Join-Path $env:TEMP "chicken-road-rush-$([guid]::NewGuid().ToString('N')).zip"

            try {
                $baseUri = "https://nodejs.org/dist/$version"
                $checksums = Invoke-WebRequest -Uri "$baseUri/SHASUMS256.txt" -UseBasicParsing
                $checksumLine = $checksums.Content -split "`n" |
                    Where-Object { ($_ -split '\s+', 2)[-1].Trim().TrimStart('*') -ceq $archiveName } |
                    Select-Object -First 1

                if (-not $checksumLine) {
                    throw "Node.js archive checksum was not found for $archiveName."
                }

                $expectedHash = ($checksumLine.Trim() -split '\s+', 2)[0]
                Invoke-WebRequest -Uri "$baseUri/$archiveName" -OutFile $archivePath -UseBasicParsing
                $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash

                if ($actualHash -ine $expectedHash) {
                    throw 'The downloaded Node.js archive failed SHA-256 verification.'
                }

                Expand-Archive -LiteralPath $archivePath -DestinationPath $runtimeRoot -Force

                if (-not (Test-Path -LiteralPath $nodeExecutable -PathType Leaf)) {
                    throw "Node.js extraction did not produce the expected executable: $nodeExecutable"
                }
            }
            finally {
                if (Test-Path -LiteralPath $archivePath) {
                    Remove-Item -LiteralPath $archivePath -Force
                }
            }
        }

        Write-Output "Using verified Node.js $version."
    }
}

$serverPath = Join-Path $PSScriptRoot '..\server.js'
if (-not (Test-Path -LiteralPath $serverPath -PathType Leaf)) {
    throw "The server entry point was not found: $serverPath"
}

$workspacePath = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'ChickenRoadRush'
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$stdoutPath = Join-Path $runtimeRoot 'server.log'
$stderrPath = Join-Path $runtimeRoot 'server-error.log'
$serverProcess = Start-Process -FilePath $nodeExecutable `
    -ArgumentList "`"$serverPath`"" `
    -WorkingDirectory $workspacePath `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -WindowStyle Hidden `
    -PassThru

$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
    if ($serverProcess.HasExited) {
        $errorOutput = if (Test-Path -LiteralPath $stderrPath) {
            Get-Content -LiteralPath $stderrPath -Raw
        }
        throw "Chicken Road Rush server exited with code $($serverProcess.ExitCode). $errorOutput"
    }

    try {
        $response = Invoke-WebRequest -Uri $studentUrl -TimeoutSec 2 -UseBasicParsing
        if ($response.Content -match 'Chicken Road Rush') {
            Start-Process $adminUrl
            Write-Output "Students: http://localhost:$serverPort"
            exit 0
        }
    }
    catch {
        if ($_.Exception.Response) {
            throw
        }
    }

    Start-Sleep -Milliseconds 500
}

throw "Chicken Road Rush did not start listening on port $serverPort within 30 seconds. See $stderrPath for server errors."
