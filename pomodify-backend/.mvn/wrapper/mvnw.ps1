# Maven Wrapper PowerShell Script
# Downloads and runs Maven if not already available

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent (Split-Path -Parent $scriptDir)
$wrapperJar = Join-Path $scriptDir "maven-wrapper.jar"
$wrapperProperties = Join-Path $scriptDir "maven-wrapper.properties"

# Read properties
$properties = @{}
if (Test-Path $wrapperProperties) {
    Get-Content $wrapperProperties | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $properties[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
}

$distributionUrl = $properties["distributionUrl"]
if (-not $distributionUrl) {
    $distributionUrl = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip"
}

# Determine Maven home directory
$mavenUserHome = $env:MAVEN_USER_HOME
if (-not $mavenUserHome) {
    $mavenUserHome = Join-Path $env:USERPROFILE ".m2"
}
$wrapperDir = Join-Path $mavenUserHome "wrapper"
$distsDir = Join-Path $wrapperDir "dists"

# Extract version from URL
if ($distributionUrl -match "apache-maven-([0-9.]+)") {
    $mavenVersion = $matches[1]
} else {
    $mavenVersion = "3.9.9"
}

$mavenHome = Join-Path $distsDir "apache-maven-$mavenVersion"
$mavenBin = Join-Path $mavenHome "bin\mvn.cmd"

# Download and extract Maven if needed
if (-not (Test-Path $mavenBin)) {
    Write-Host "Downloading Maven $mavenVersion..."
    
    # Create directories
    if (-not (Test-Path $distsDir)) {
        New-Item -ItemType Directory -Path $distsDir -Force | Out-Null
    }
    
    $zipFile = Join-Path $distsDir "apache-maven-$mavenVersion.zip"
    
    # Download
    if (-not (Test-Path $zipFile)) {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $distributionUrl -OutFile $zipFile -UseBasicParsing
    }
    
    # Extract
    Write-Host "Extracting Maven..."
    Expand-Archive -Path $zipFile -DestinationPath $distsDir -Force
    
    Write-Host "Maven $mavenVersion installed to $mavenHome"
}

# Output the command for mvnw.cmd to use
Write-Output "MVNW_CMD=$mavenBin"
