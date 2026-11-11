<#
  Backup lógico do projeto Supabase COMPARTILHADO (site institucional + portal).
  Uso (na raiz do projeto):  powershell -ExecutionPolicy Bypass -File scripts\backup-supabase.ps1
  Requer Docker Desktop aberto (Supabase CLI via npx) ou, na falta dele, pg_dump 17+ no PATH.
  A senha é digitada de forma oculta e não é gravada em disco, em log nem no histórico.
  Os arquivos gerados contêm dados pessoais e hashes de senha: NUNCA versionar.
#>
param(
  [string]$Destino = (Join-Path $PSScriptRoot '..\backups'),
  [string]$ProjectRef = 'fbzkhxfcsxkqrpqfitwr'
)
$ErrorActionPreference = 'Stop'

function Invoke-Step([string]$Nome, [scriptblock]$Cmd, [switch]$Opcional) {
  Write-Host "-> $Nome" -ForegroundColor Cyan
  & $Cmd
  if ($LASTEXITCODE -ne 0) {
    if ($Opcional) { Write-Warning "$Nome falhou (opcional, seguindo)."; return }
    throw "$Nome falhou (código $LASTEXITCODE)."
  }
}

# 1) Destino: precisa estar fora do Git.
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$dir = Join-Path (Resolve-Path $Destino).Path $stamp
New-Item -ItemType Directory -Path $dir | Out-Null
if (Get-Command git -ErrorAction SilentlyContinue) {
  git check-ignore -q $dir 2>$null
  $ignored = ($LASTEXITCODE -eq 0)
  git rev-parse --is-inside-work-tree 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0 -and -not $ignored) { throw "O destino $dir está dentro do repositório e NÃO está no .gitignore." }
}

# 2) Conexão: string do Session pooler com o marcador [YOUR-PASSWORD] + senha oculta.
$uri = Read-Host 'Cole a connection string do Session pooler (Supabase > Connect), mantendo [YOUR-PASSWORD]'
if ($uri -notmatch [regex]::Escape($ProjectRef)) { throw 'A connection string não é do projeto esperado.' }
if ($uri -notmatch '\[YOUR-PASSWORD\]') { throw 'Use a string com o marcador [YOUR-PASSWORD]; a senha é pedida a seguir.' }
$sec = Read-Host 'Senha do banco (não aparece na tela)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)

try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $docker = $false
  if (Get-Command docker -ErrorAction SilentlyContinue) { docker info *> $null; $docker = ($LASTEXITCODE -eq 0) }

  if ($docker) {
    $mode = 'supabase-cli'
    $db = $uri.Replace('[YOUR-PASSWORD]', [Uri]::EscapeDataString($plain))
    $cli = { npx --yes supabase@latest db dump --db-url $db @args }
    Invoke-Step 'Papéis (roles)' { & $cli -f "$dir\roles.sql" --role-only }
    Invoke-Step 'Estrutura (public e demais schemas do projeto)' { & $cli -f "$dir\schema.sql" }
    Invoke-Step 'Dados (public, auth, storage...)' { & $cli -f "$dir\data.sql" --use-copy --data-only -x storage.buckets_vectors -x storage.vector_indexes }
    Invoke-Step 'Histórico de migrations (estrutura)' { & $cli -f "$dir\history_schema.sql" --schema supabase_migrations }
    Invoke-Step 'Histórico de migrations (dados)' { & $cli -f "$dir\history_data.sql" --use-copy --data-only --schema supabase_migrations }
    Invoke-Step 'Schemas gerenciados auth/storage (personalizações)' { & $cli -f "$dir\managed_auth_storage.sql" --schema auth,storage } -Opcional
  }
  elseif (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    $mode = 'pg_dump'
    $ver = [int](((pg_dump --version) -replace '[^\d\.]', ' ').Trim().Split(' ')[0].Split('.')[0])
    if ($ver -lt 17) { throw "pg_dump $ver é antigo; instale o cliente PostgreSQL 17 ou abra o Docker Desktop." }
    $env:PGPASSWORD = $plain
    $db = $uri.Replace(':[YOUR-PASSWORD]', '')
    Invoke-Step 'Estrutura (public)' { pg_dump --dbname=$db --schema-only --schema=public -f "$dir\schema.sql" }
    Invoke-Step 'Dados (public, auth, storage)' { pg_dump --dbname=$db --data-only --schema=public --schema=auth --schema=storage --exclude-table=storage.buckets_vectors --exclude-table=storage.vector_indexes -f "$dir\data.sql" }
    Invoke-Step 'Histórico de migrations' { pg_dump --dbname=$db --schema=supabase_migrations -f "$dir\history_schema.sql" }
    Invoke-Step 'Schemas gerenciados auth/storage' { pg_dump --dbname=$db --schema-only --schema=auth --schema=storage -f "$dir\managed_auth_storage.sql" } -Opcional
    Write-Warning 'Modo pg_dump: papéis (roles) não são exportados pelo pooler.'
  }
  else { throw 'Nem Docker em execução nem pg_dump encontrados. Abra o Docker Desktop e rode de novo.' }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Remove-Variable plain, db -ErrorAction SilentlyContinue
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# 3) Manifesto com tamanho e SHA-256 (sem conteúdo).
$files = Get-ChildItem $dir -File | ForEach-Object {
  [pscustomobject]@{ file = $_.Name; bytes = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash }
}
[pscustomobject]@{ projectRef = $ProjectRef; createdAt = (Get-Date).ToString('o'); mode = $mode; files = $files } |
  ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 "$dir\manifest.json"

Write-Host "`nBackup gerado em: $dir" -ForegroundColor Green
$files | Format-Table -AutoSize
Write-Host 'Próximo passo: avise o Claude para validar (scripts/validar_backup.py). Depois mova a pasta para armazenamento criptografado.' -ForegroundColor Yellow
