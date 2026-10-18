# Read-only host inventory for the Meet + Salesforce MVP.
# No audio capture, application launch, credentials, device IDs or settings changes.
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-AudioEndpointSummary {
    param([string]$Direction)
    $endpointRoot = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\$Direction"
    try {
        $endpoints = @(Get-ChildItem -LiteralPath $endpointRoot -ErrorAction Stop)
        $activeCount = 0
        $unknownCount = 0
        foreach ($endpoint in $endpoints) {
            try {
                $deviceState = Get-ItemPropertyValue -LiteralPath $endpoint.PSPath -Name DeviceState -ErrorAction Stop
                if (($deviceState -band 1) -eq 1) { $activeCount++ }
            } catch {
                $unknownCount++
            }
        }
        return [ordered]@{
            status = 'OBSERVED'
            enumerated = $endpoints.Count
            active = $activeCount
            unreadable = $unknownCount
            streamAndPermissionVerified = $false
        }
    } catch {
        return [ordered]@{
            status = 'UNVERIFIED'
            reason = $_.Exception.GetType().Name
            streamAndPermissionVerified = $false
        }
    }
}

function Get-BrowserSummary {
    param([string]$Name, [string]$RelativePath)
    $candidates = @(
        (Join-Path $env:ProgramFiles $RelativePath)
        (Join-Path ${env:ProgramFiles(x86)} $RelativePath)
        (Join-Path $env:LOCALAPPDATA $RelativePath)
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            try {
                return [ordered]@{
                    name = $Name
                    status = 'OBSERVED'
                    version = (Get-Item -LiteralPath $candidate).VersionInfo.ProductVersion
                    meetCompatibilityVerified = $false
                }
            } catch {
                return [ordered]@{ name = $Name; status = 'UNVERIFIED'; reason = $_.Exception.GetType().Name }
            }
        }
    }
    return [ordered]@{ name = $Name; status = 'NOT_FOUND_IN_STANDARD_LOCATIONS' }
}

try {
    $windowsInfo = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
    $report = [ordered]@{
        schemaVersion = 1
        collectedAtUtc = [DateTime]::UtcNow.ToString('o')
        kind = 'READ_ONLY_HOST_INVENTORY'
        windows = [ordered]@{
            build = [string]$windowsInfo.CurrentBuildNumber
            processArchitecture = $env:PROCESSOR_ARCHITECTURE
        }
        browsers = @(
            (Get-BrowserSummary -Name 'Chrome' -RelativePath 'Google\Chrome\Application\chrome.exe')
            (Get-BrowserSummary -Name 'Edge' -RelativePath 'Microsoft\Edge\Application\msedge.exe')
        )
        audio = [ordered]@{
            capture = Get-AudioEndpointSummary -Direction 'Capture'
            render = Get-AudioEndpointSummary -Direction 'Render'
        }
        functionalAcceptance = 'NOT_RUN'
        limitations = @(
            'Inventory does not prove microphone permissions, selected/default routing, loopback, virtual microphone, remote capture, Meet compatibility or TTS delivery.'
            'No host/user names, audio-device names/IDs, process command lines, meeting links or authentication state collected.'
        )
    }
    $report | ConvertTo-Json -Depth 6
} catch {
    [ordered]@{
        schemaVersion = 1
        kind = 'READ_ONLY_HOST_INVENTORY'
        status = 'UNVERIFIED'
        reason = $_.Exception.GetType().Name
        functionalAcceptance = 'NOT_RUN'
    } | ConvertTo-Json
    exit 1
}
