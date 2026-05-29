$json = Invoke-RestMethod -Uri 'https://unsplash.com/napi/search/photos?query=cinema+theater+modern'
Write-Host "Results:"
foreach ($item in $json.results | Select-Object -First 10) {
    Write-Host ("ID: " + $item.id)
}
