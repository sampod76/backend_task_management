param(
  [Parameter(Mandatory=$true)]
  [string]$msg
)

# নিরাপদ: কোনো কমান্ড ফেল করলে থামবে
$ErrorActionPreference = "Stop"

git add .
git commit -m $msg
git push

Write-Host "Git commands executed successfully."
