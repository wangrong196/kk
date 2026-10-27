#!/usr/bin/env pwsh
# knowledge-workshop DSH 插件安装脚本
# 用法: .\install.ps1 -KBRoot "C:\Users\YourName\.dsh\kb" -LicenseKey "xxxx-xxxx"

param(
    [string]$KBRoot,
    [string]$LicenseKey = ""
)

$pluginDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$profilesDir = Join-Path $env:USERPROFILE ".dsh\profiles\desktop"
$targetDir = Join-Path $profilesDir "dsh-knowledge-workshop"

Write-Host "📚 知识工坊插件安装" -ForegroundColor Cyan
Write-Host "目标目录: $targetDir" -ForegroundColor Gray

# 创建目标目录
if (Test-Path $targetDir) {
    Write-Host "⚠️  目录已存在，将覆盖: $targetDir" -ForegroundColor Yellow
    Remove-Item $targetDir -Recurse -Force
}
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

# 复制文件
Copy-Item (Join-Path $pluginDir "index.js") $targetDir -Force
Copy-Item (Join-Path $pluginDir "client.js") $targetDir -Force
Copy-Item (Join-Path $pluginDir "cordis.patch.yml") $targetDir -Force
Copy-Item (Join-Path $pluginDir "icon.svg") $targetDir -Force
Copy-Item (Join-Path $pluginDir "package.json") $targetDir -Force

# 复制 locale
if (Test-Path (Join-Path $pluginDir "locale")) {
    Copy-Item (Join-Path $pluginDir "locale") (Join-Path $targetDir "locale") -Recurse -Force
}

# 写入 KB_ROOT 配置（如果指定了）
if ($KBRoot) {
    $envFile = Join-Path $targetDir ".env"
    Set-Content -Path $envFile -Value "KNOWLEDGE_WORKSHOP_ROOT=$KBRoot" -Encoding UTF8
    Write-Host "✅ 知识库根目录: $KBRoot" -ForegroundColor Green
} else {
    Write-Host "ℹ️  使用默认知识库路径（可在 index.js 中修改）" -ForegroundColor Gray
}

# 写入 License（如果指定了）
if ($LicenseKey) {
    $licenseFile = Join-Path $targetDir ".license"
    Set-Content -Path $licenseFile -Value $LicenseKey -Encoding UTF8
    Write-Host "✅ 许可证已写入" -ForegroundColor Green
}

# 更新 package.json 中的私有标记
$pjPath = Join-Path $targetDir "package.json"
$pj = Get-Content $pjPath -Raw | ConvertFrom-Json
$pj.private = $false
$pj | ConvertTo-Json -Depth 10 | Set-Content $pjPath -Encoding UTF8

Write-Host ""
Write-Host "🔧 下一步操作：" -ForegroundColor Cyan
Write-Host "  1. 打开 DSH → 设置 → 插件" -ForegroundColor White
Write-Host "  2. 点击「安装本地插件」，选择: $targetDir" -ForegroundColor White
Write-Host "  3. 启用 dsh-knowledge-workshop" -ForegroundColor White
Write-Host "  4. 刷新 DSH Web GUI 页面" -ForegroundColor White
Write-Host ""
Write-Host "✅ 安装完成！" -ForegroundColor Green
