param(
  [string]$ProjectRoot = "D:\agent-projects\learning-kanban",
  [switch]$Once
)

$ErrorActionPreference = "SilentlyContinue"
$dataPath = Join-Path $ProjectRoot "data\tasks.json"

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase

function Save-Tasks {
  param([object[]]$Tasks)
  $json = $Tasks | ConvertTo-Json -Depth 20
  $json | Set-Content -LiteralPath $dataPath -Encoding UTF8
}

function Show-TopReminder {
  param(
    [string]$Title,
    [string]$Body
  )

  $window = New-Object Windows.Window
  $window.Width = 520
  $window.Height = 116
  $window.Topmost = $true
  $window.WindowStyle = "None"
  $window.ResizeMode = "NoResize"
  $window.ShowInTaskbar = $false
  $window.AllowsTransparency = $true
  $window.Background = [Windows.Media.Brushes]::Transparent
  $window.Left = ([System.Windows.SystemParameters]::PrimaryScreenWidth - $window.Width) / 2
  $window.Top = 24

  $border = New-Object Windows.Controls.Border
  $border.CornerRadius = New-Object Windows.CornerRadius(16)
  $border.Background = New-Object Windows.Media.SolidColorBrush([Windows.Media.Color]::FromRgb(17, 24, 39))
  $border.BorderBrush = New-Object Windows.Media.SolidColorBrush([Windows.Media.Color]::FromRgb(96, 165, 250))
  $border.BorderThickness = New-Object Windows.Thickness(1)
  $border.Padding = New-Object Windows.Thickness(18)
  $border.Effect = New-Object Windows.Media.Effects.DropShadowEffect -Property @{
    BlurRadius = 24
    ShadowDepth = 8
    Opacity = 0.28
  }

  $grid = New-Object Windows.Controls.Grid
  $grid.ColumnDefinitions.Add((New-Object Windows.Controls.ColumnDefinition -Property @{ Width = "Auto" }))
  $grid.ColumnDefinitions.Add((New-Object Windows.Controls.ColumnDefinition -Property @{ Width = "*" }))
  $grid.ColumnDefinitions.Add((New-Object Windows.Controls.ColumnDefinition -Property @{ Width = "Auto" }))

  $badge = New-Object Windows.Controls.Border
  $badge.Width = 42
  $badge.Height = 42
  $badge.CornerRadius = New-Object Windows.CornerRadius(12)
  $badge.Background = New-Object Windows.Media.SolidColorBrush([Windows.Media.Color]::FromRgb(37, 99, 235))
  $badge.Margin = New-Object Windows.Thickness(0, 0, 14, 0)
  $badgeText = New-Object Windows.Controls.TextBlock
  $badgeText.Text = "!"
  $badgeText.Foreground = [Windows.Media.Brushes]::White
  $badgeText.FontSize = 24
  $badgeText.FontWeight = "Bold"
  $badgeText.HorizontalAlignment = "Center"
  $badgeText.VerticalAlignment = "Center"
  $badge.Child = $badgeText
  [Windows.Controls.Grid]::SetColumn($badge, 0)

  $textStack = New-Object Windows.Controls.StackPanel
  $textStack.VerticalAlignment = "Center"
  $titleBlock = New-Object Windows.Controls.TextBlock
  $titleBlock.Text = $Title
  $titleBlock.Foreground = [Windows.Media.Brushes]::White
  $titleBlock.FontSize = 17
  $titleBlock.FontWeight = "SemiBold"
  $titleBlock.TextTrimming = "CharacterEllipsis"
  $bodyBlock = New-Object Windows.Controls.TextBlock
  $bodyBlock.Text = $Body
  $bodyBlock.Foreground = New-Object Windows.Media.SolidColorBrush([Windows.Media.Color]::FromRgb(203, 213, 225))
  $bodyBlock.FontSize = 13
  $bodyBlock.Margin = New-Object Windows.Thickness(0, 5, 0, 0)
  $bodyBlock.TextTrimming = "CharacterEllipsis"
  $textStack.Children.Add($titleBlock) | Out-Null
  $textStack.Children.Add($bodyBlock) | Out-Null
  [Windows.Controls.Grid]::SetColumn($textStack, 1)

  $closeButton = New-Object Windows.Controls.Button
  $closeButton.Content = "×"
  $closeButton.Width = 30
  $closeButton.Height = 30
  $closeButton.BorderThickness = New-Object Windows.Thickness(0)
  $closeButton.Foreground = [Windows.Media.Brushes]::White
  $closeButton.Background = New-Object Windows.Media.SolidColorBrush([Windows.Media.Color]::FromRgb(31, 41, 55))
  $closeButton.Add_Click({ $window.Close() })
  [Windows.Controls.Grid]::SetColumn($closeButton, 2)

  $grid.Children.Add($badge) | Out-Null
  $grid.Children.Add($textStack) | Out-Null
  $grid.Children.Add($closeButton) | Out-Null
  $border.Child = $grid
  $window.Content = $border

  $timer = New-Object Windows.Threading.DispatcherTimer
  $timer.Interval = [TimeSpan]::FromSeconds(12)
  $timer.Add_Tick({
    $timer.Stop()
    $window.Close()
  })
  $window.Add_Loaded({ $timer.Start() })
  $window.ShowDialog() | Out-Null
}

function Invoke-ReminderCheck {
  if (-not (Test-Path -LiteralPath $dataPath)) {
    return
  }

  $raw = Get-Content -LiteralPath $dataPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return
  }

  $tasks = @($raw | ConvertFrom-Json)
  $changed = $false
  $now = Get-Date
  $staleCutoff = $now.AddMinutes(-5)

  foreach ($task in $tasks) {
    if ($task.status -eq "done" -or $task.remindedAt -or -not $task.reminderAt) {
      continue
    }
    $reminderTime = [datetime]::Parse($task.reminderAt)
    if ($reminderTime -le $now) {
      if ($reminderTime -lt $staleCutoff) {
        $task | Add-Member -NotePropertyName remindedAt -NotePropertyValue ((Get-Date).ToString("o")) -Force
        $changed = $true
        continue
      }
      Show-TopReminder -Title $task.title -Body "$($task.area)  $($reminderTime.ToString('yyyy-MM-dd HH:mm'))"
      $task | Add-Member -NotePropertyName remindedAt -NotePropertyValue ((Get-Date).ToString("o")) -Force
      $changed = $true
    }
  }

  if ($changed) {
    Save-Tasks -Tasks $tasks
  }
}

do {
  Invoke-ReminderCheck
  if ($Once) {
    break
  }
  Start-Sleep -Seconds 30
} while ($true)
