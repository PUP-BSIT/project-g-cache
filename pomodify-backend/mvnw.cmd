@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script, version 3.3.2
@REM
@REM Optional ENV vars
@REM   MVNW_REPOURL - repo url base for downloading maven distribution
@REM   MVNW_USERNAME/MVNW_PASSWORD - user and password for downloading maven
@REM   MVNW_VERBOSE - true: enable verbose log; others: silence the output
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0_NAME__%"=="" (SET __MVNW_ARG0_NAME__=%~nx0)
@SET __MVNW_CMD__=
@SET __MVNW_ERROR__=
@SET __MVNW_PSMODULEP_SAVE__=%PSModulePath%
@SET PSModulePath=
@FOR /F "usebackq tokens=1* delims==" %%A IN (`powershell -noprofile "& {$scriptDir='%~dp0'; $script='%~dp0.mvn\wrapper\mvnw.ps1'; if (Test-Path $script) { & $script %* } else { $MAVEN_HOME = $env:MAVEN_HOME; if (-not $MAVEN_HOME) { $MAVEN_HOME = $env:M2_HOME }; if ($MAVEN_HOME) { Write-Output ('MVNW_CMD=' + $MAVEN_HOME + '\bin\mvn.cmd') } else { Write-Output 'MVNW_ERROR=MAVEN_HOME or M2_HOME not set and .mvn\wrapper\mvnw.ps1 not found' } }; exit $LASTEXITCODE}"`) DO @(
  IF "%%A"=="MVNW_CMD" SET __MVNW_CMD__=%%B
  IF "%%A"=="MVNW_ERROR" SET __MVNW_ERROR__=%%B
)
@SET PSModulePath=%__MVNW_PSMODULEP_SAVE__%
@IF NOT "%__MVNW_ERROR__%"=="" @(
  ECHO %__MVNW_ERROR__%
  EXIT /B 1
)
@IF NOT "%__MVNW_CMD__%"=="" @(
  %__MVNW_CMD__% %*
  IF ERRORLEVEL 1 EXIT /B 1
  EXIT /B 0
)

@REM Fallback: try to find mvn in PATH or use MAVEN_HOME
@SET MAVEN_CMD=mvn
@IF NOT "%MAVEN_HOME%"=="" SET MAVEN_CMD=%MAVEN_HOME%\bin\mvn
@IF NOT "%M2_HOME%"=="" SET MAVEN_CMD=%M2_HOME%\bin\mvn

@REM Try to run maven
%MAVEN_CMD% %*
@IF ERRORLEVEL 1 EXIT /B 1
