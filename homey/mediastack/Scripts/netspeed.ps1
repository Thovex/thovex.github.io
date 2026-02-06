$sleep = 1

while ($true) {
  $samples = (Get-Counter '\Network Interface(*)\Bytes Received/sec').CounterSamples |
    Where-Object { $_.InstanceName -notmatch 'Loopback|isatap|Teredo|Bluetooth' }

  $top = $samples | Sort-Object CookedValue -Descending | Select-Object -First 1
  $mbps = ($top.CookedValue * 8) / 1e6

  cls
  "{0}  Receive: {1:N2} Mbps" -f $top.InstanceName, $mbps
  Start-Sleep $sleep
}
