# Function to check if a port is in use
function Test-PortInUse {
    param($port)
    
    $connection = New-Object System.Net.Sockets.TcpClient
    try {
        $connection.Connect("localhost", $port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Function to terminate processes using port 3000
function Stop-PortProcesses {
    param($port)
    $processes = netstat -ano | findstr ":$port"
    if ($processes) {
        Write-Host "Found processes using port $port. Attempting to terminate..." -ForegroundColor Yellow
        $processes | ForEach-Object {
            $processId = ($_ -split '\s+')[-1]
            try {
                Stop-Process -Id $processId -Force
                Write-Host "Terminated process $processId" -ForegroundColor Green
            } catch {
                Write-Host "Failed to terminate process $processId" -ForegroundColor Red
            }
        }
        Start-Sleep -Seconds 2
    }
}

# Clear the terminal
Clear-Host

Write-Host "Lumi6 Server Setup" -ForegroundColor Cyan
Write-Host "-------------------" -ForegroundColor Cyan

# Add Node.js to PATH for this session
$env:PATH += ";C:\Program Files\nodejs"

# Check if port 3000 is in use
if (Test-PortInUse 3000) {
    Write-Host "Port 3000 is in use. Attempting to free it..." -ForegroundColor Yellow
    Stop-PortProcesses 3000
}

# Verify Node.js is accessible
try {
    $nodeVersion = & "C:\Program Files\nodejs\node.exe" --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: Node.js not found or not accessible" -ForegroundColor Red
    Write-Host "Please ensure Node.js is installed at C:\Program Files\nodejs" -ForegroundColor Red
    exit 1
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    try {
        & "C:\Program Files\nodejs\npm.cmd" install
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "✗ Error installing dependencies" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

# Build the project
Write-Host "Building project..." -ForegroundColor Yellow
try {
    & "C:\Program Files\nodejs\npm.cmd" run build
    Write-Host "✓ Build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Build failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Check if dist folder exists and contains index.html
if (-not (Test-Path "dist\index.html")) {
    Write-Host "✗ Error: dist/index.html not found. Build may have failed." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✓ Build files verified" -ForegroundColor Green
}

Write-Host "`nStarting server..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

# Start the server
try {
    & "C:\Program Files\nodejs\node.exe" server.cjs
} catch {
    Write-Host "✗ Server failed to start" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
} 