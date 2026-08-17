param(
  [string]$SourcePng = "D:\agent-projects\learning-kanban\assets\icons\custom\cj-board-desktop-source.png",
  [string]$Path = "D:\agent-projects\learning-kanban\CJBoardDesktop.ico"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SourcePng)) {
  throw "Source PNG not found: $SourcePng"
}

Add-Type -AssemblyName System.Drawing

$sourceImage = [Drawing.Image]::FromFile($SourcePng)
$bitmap = New-Object Drawing.Bitmap 256, 256
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.Clear([Drawing.Color]::Transparent)
$graphics.DrawImage($sourceImage, 0, 0, 256, 256)

$radius = 28
for ($y = 0; $y -lt 256; $y++) {
  for ($x = 0; $x -lt 256; $x++) {
    $dx = 0
    $dy = 0
    if ($x -lt $radius) { $dx = $radius - $x }
    elseif ($x -gt (255 - $radius)) { $dx = $x - (255 - $radius) }
    if ($y -lt $radius) { $dy = $radius - $y }
    elseif ($y -gt (255 - $radius)) { $dy = $y - (255 - $radius) }
    if (($dx * $dx + $dy * $dy) -gt ($radius * $radius)) {
      $bitmap.SetPixel($x, $y, [Drawing.Color]::Transparent)
    }
  }
}

$imageData = New-Object IO.MemoryStream
$imageWriter = New-Object IO.BinaryWriter $imageData

# BITMAPINFOHEADER for a 32-bit DIB inside ICO. ICO stores DIB pixels bottom-up,
# and the header height includes the XOR bitmap plus the AND mask.
$imageWriter.Write([UInt32]40)
$imageWriter.Write([Int32]256)
$imageWriter.Write([Int32]512)
$imageWriter.Write([UInt16]1)
$imageWriter.Write([UInt16]32)
$imageWriter.Write([UInt32]0)
$imageWriter.Write([UInt32]0)
$imageWriter.Write([Int32]0)
$imageWriter.Write([Int32]0)
$imageWriter.Write([UInt32]0)
$imageWriter.Write([UInt32]0)

for ($y = 255; $y -ge 0; $y--) {
  for ($x = 0; $x -lt 256; $x++) {
    $pixel = $bitmap.GetPixel($x, $y)
    $imageWriter.Write([Byte]$pixel.B)
    $imageWriter.Write([Byte]$pixel.G)
    $imageWriter.Write([Byte]$pixel.R)
    $imageWriter.Write([Byte]$pixel.A)
  }
}

# AND mask. A zero mask preserves the alpha channel from the 32-bit bitmap.
$maskRow = New-Object byte[] 32
for ($y = 0; $y -lt 256; $y++) {
  $imageWriter.Write($maskRow)
}

$imageWriter.Flush()
$iconBytes = $imageData.ToArray()

$graphics.Dispose()
$bitmap.Dispose()
$sourceImage.Dispose()
$imageWriter.Dispose()
$imageData.Dispose()

$stream = [IO.File]::Create($Path)
$writer = New-Object IO.BinaryWriter $stream

# ICONDIR
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)

# ICONDIRENTRY. Width/height 0 means 256 px.
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$iconBytes.Length)
$writer.Write([UInt32]22)

$writer.Write($iconBytes)
$writer.Close()
$stream.Close()

Write-Output "Icon written: $Path"
