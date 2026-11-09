# ==============================================================================
# Script para empaquetar UniShare de forma limpia y optimizada
# Excluye: node_modules, .git, .expo, .env privados, logs y archivos temporales
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

# Obtener todos los archivos recursivamente incluyendo ocultos
$allFiles = Get-ChildItem -Path $SourceDir -Recurse -Force -File

$includedFiles = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
$excludedCount = 0

foreach ($file in $allFiles) {
    # Calcular ruta relativa y normalizar con separadores '/'
    $relPath = $file.FullName.Substring($SourceDir.Length).TrimStart('\', '/')
    $relNormalized = $relPath.Replace('\', '/')

    # 1. Excluir historial de Git (.git)
    if ($relNormalized -match '(^|/)\.git(/|$)') {
        $excludedCount++
        continue
    }

    # 2. Excluir dependencias pesadas (node_modules)
    if ($relNormalized -match '(^|/)node_modules(/|$)') {
        $excludedCount++
        continue
    }

    # 3. Excluir caché de Expo (.expo, .expo-shared)
    if ($relNormalized -match '(^|/)\.expo(-shared)?(/|$)') {
        $excludedCount++
        continue
    }

    # 4. Excluir archivos de variables de entorno privados (.env, .env.local, .env.production, etc.)
    # Se conservan únicamente los archivos de ejemplo (.env.example)
    if ($file.Name -match '^\.env' -and $file.Name -notmatch '\.example$') {
        Write-Host "  [Excluido - Credencial privada]: $relNormalized" -ForegroundColor DarkYellow
        $excludedCount++
        continue
    }

    # 5. Excluir archivos de log (*.log, npm-debug.log*)
    if ($file.Name -like '*.log' -or $file.Name -like 'npm-debug.log*' -or $file.Name -like 'yarn-error.log*') {
        Write-Host "  [Excluido - Archivo de log]: $relNormalized" -ForegroundColor DarkYellow
        $excludedCount++
        continue
    }

    # 6. Excluir el propio archivo ZIP generado o cualquier .zip en la raíz
    if ($file.FullName -eq $OutputFile -or $file.Extension -ieq '.zip') {
        $excludedCount++
        continue
    }

    $includedFiles.Add($file)
}

Write-Host "`nTotal archivos escaneados: $($allFiles.Count)" -ForegroundColor White
Write-Host "Archivos excluidos:       $excludedCount" -ForegroundColor Yellow
Write-Host "Archivos a empaquetar:    $($includedFiles.Count)" -ForegroundColor Green

# Crear el archivo ZIP usando System.IO.Compression.ZipArchive con compresión óptima
$zipMode = [System.IO.Compression.ZipArchiveMode]::Create
$zipStream = [System.IO.File]::Open($OutputFile, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($zipStream, $zipMode)

try {
    foreach ($file in $includedFiles) {
        $entryName = $file.FullName.Substring($SourceDir.Length).TrimStart('\', '/').Replace('\', '/')
        
        # Crear entrada en el zip y copiar contenido con Optimal compression
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
