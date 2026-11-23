# ==============================================================================
# Script para empaquetar UniShare de forma limpia y ultra-rápida
# Excluye: node_modules, .git, .expo, .env privados, logs y temporales
# ==============================================================================

param(
    [string]$SourceDir = $PSScriptRoot,
    [string]$OutputFile = (Join-Path $PSScriptRoot "unishare_proyecto_limpio.zip")
)

Write-Host "Iniciando empaquetado limpio de UniShare..." -ForegroundColor Cyan
Write-Host "Directorio origen: $SourceDir" -ForegroundColor Gray
Write-Host "Archivo destino:   $OutputFile" -ForegroundColor Gray

# Cargar ensamblados de compresión de .NET
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Si el archivo destino ya existe, eliminarlo para empezar limpio
if (Test-Path $OutputFile) {
    Write-Host "Eliminando archivo zip previo..." -ForegroundColor Yellow
    Remove-Item -Path $OutputFile -Force
}

# Enumeración optimizada podando subdirectorios pesados a nivel de carpeta
function Get-CleanProjectFiles {
    param([string]$dir)
    $items = Get-ChildItem -Path $dir -Force
    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            # Omitir carpetas pesadas inmediatamente sin recorrer sus contenidos
            if ($item.Name -in @('.git', 'node_modules', '.expo', '.expo-shared', '.vscode', '.idea')) {
                continue
            }
            Get-CleanProjectFiles -dir $item.FullName
        } else {
            $item
        }
    }
}

$allFiles = Get-CleanProjectFiles -dir $SourceDir
$includedFiles = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
$excludedCount = 0

foreach ($file in $allFiles) {
    $relPath = $file.FullName.Substring($SourceDir.Length).TrimStart('\', '/')
    $relNormalized = $relPath.Replace('\', '/')

    # 1. Excluir credenciales privadas (.env no example)
    if ($file.Name -match '^\.env' -and $file.Name -notmatch '\.example$') {
        Write-Host "  [Excluido - Credencial privada]: $relNormalized" -ForegroundColor DarkYellow
        $excludedCount++
        continue
    }

    # 2. Excluir logs
    if ($file.Name -like '*.log' -or $file.Name -like 'npm-debug.log*' -or $file.Name -like 'yarn-error.log*') {
        Write-Host "  [Excluido - Log]: $relNormalized" -ForegroundColor DarkYellow
        $excludedCount++
        continue
    }

    # 3. Excluir archivos .zip
    if ($file.FullName -eq $OutputFile -or $file.Extension -ieq '.zip') {
        $excludedCount++
        continue
    }

    $includedFiles.Add($file)
}

Write-Host "`nTotal archivos seleccionados: $($includedFiles.Count)" -ForegroundColor Green

# Crear el archivo ZIP usando ZipArchive con compresión óptima
$zipMode = [System.IO.Compression.ZipArchiveMode]::Create
$zipStream = [System.IO.File]::Open($OutputFile, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($zipStream, $zipMode)

try {
    foreach ($file in $includedFiles) {
        $entryName = $file.FullName.Substring($SourceDir.Length).TrimStart('\', '/').Replace('\', '/')
        $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        try {
            $fileStream.CopyTo($entryStream)
        }
        finally {
            $fileStream.Close()
            $entryStream.Close()
        }
    }
}
finally {
    $archive.Dispose()
    $zipStream.Dispose()
}

$zipInfo = Get-Item $OutputFile
$sizeKB = [math]::Round($zipInfo.Length / 1KB, 2)
$sizeMB = [math]::Round($zipInfo.Length / 1MB, 2)

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "ZIP CREADO EXITOSAMENTE:" -ForegroundColor Green
Write-Host "Archivo: $($zipInfo.FullName)" -ForegroundColor White
Write-Host "Tamaño:  $sizeKB KB ($sizeMB MB)" -ForegroundColor White
Write-Host "==================================================`n" -ForegroundColor Green
