$git = "C:\Program Files\Git\cmd\git.exe"
if (!(Test-Path $git)) {
    Write-Host "Git not found at default location. Falling back to simply 'git'."
    $git = "git"
}

& $git add .
& $git commit -m "feat: complete Epics 2, 3, 4, 5 (Depreciation, Revaluation, RAG, Mobile Approvals)"
& $git push origin main
