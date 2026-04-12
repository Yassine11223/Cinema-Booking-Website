$queries = @("home theater", "auditorium", "movie theater seat", "imax", "surround sound", "dolby")
foreach ($q in $queries) {
    $url = "https://unsplash.com/napi/search/photos?query=$([uri]::EscapeDataString($q))"
    $json = Invoke-RestMethod -Uri $url
    Write-Host "Query: $q"
    foreach ($item in $json.results | Select-Object -First 2) {
        Write-Host "  URL: https://images.unsplash.com/photo-$($item.id)?auto=format&fit=crop&q=80&w=1200"
    }
}
