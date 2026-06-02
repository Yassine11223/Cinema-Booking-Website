$ErrorActionPreference = 'Stop'

function Test-PortOpen($Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $result = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne(1000, $false)) { return $false }
        $client.EndConnect($result)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mongoRoot = Join-Path $root '.mongodb-small'
$mongod = Get-ChildItem -Path $mongoRoot -Recurse -Filter mongod.exe -ErrorAction Stop | Select-Object -First 1 -ExpandProperty FullName
$dbPath = Join-Path $mongoRoot 'data\db'
$logPath = Join-Path $mongoRoot 'mongod.log'
New-Item -ItemType Directory -Path $dbPath -Force | Out-Null

if (-not (Test-PortOpen 27017)) {
    Start-Process -FilePath $mongod -ArgumentList @('--dbpath', $dbPath, '--bind_ip', '127.0.0.1', '--port', '27017', '--logpath', $logPath, '--logappend') -WindowStyle Hidden | Out-Null
    Start-Sleep -Seconds 3
}

if (Test-PortOpen 5000) {
    Write-Host 'Backend already running on http://localhost:5000'
    exit 0
}

Write-Host 'Starting backend on http://localhost:5000'
Set-Location $root
node server.js