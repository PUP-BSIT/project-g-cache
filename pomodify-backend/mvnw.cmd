@REM Maven Wrapper for Windows
@REM Downloads Maven automatically if not present

@echo off
setlocal

set "MAVEN_VERSION=3.9.9"
set "MAVEN_USER_HOME=%USERPROFILE%\.m2"
set "WRAPPER_DIR=%MAVEN_USER_HOME%\wrapper\dists"
set "MAVEN_HOME=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%"
set "MAVEN_CMD=%MAVEN_HOME%\bin\mvn.cmd"
set "DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip"
set "ZIP_FILE=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%.zip"

@REM Check if Maven is already downloaded
if exist "%MAVEN_CMD%" goto runMaven

@REM Create wrapper directory
if not exist "%WRAPPER_DIR%" mkdir "%WRAPPER_DIR%"

@REM Download Maven
echo Downloading Maven %MAVEN_VERSION%...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ZIP_FILE%' -UseBasicParsing"

if not exist "%ZIP_FILE%" (
    echo Failed to download Maven
    exit /b 1
)

@REM Extract Maven
echo Extracting Maven...
powershell -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%WRAPPER_DIR%' -Force"

if not exist "%MAVEN_CMD%" (
    echo Failed to extract Maven
    exit /b 1
)

echo Maven %MAVEN_VERSION% installed successfully

:runMaven
"%MAVEN_CMD%" %*
