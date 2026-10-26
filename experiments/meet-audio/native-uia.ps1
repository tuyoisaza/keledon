$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try {
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  $expectedExe = [IO.Path]::GetFullPath([string]$request.executable)
  if ($expectedExe -notmatch '^[A-Za-z]:\\.+\.exe$') { throw 'NATIVE_SCOPE_DENIED' }
  function Short($value,$limit) { $value=[string]$value; if ($value.Length -gt $limit) { return $value.Substring(0,$limit) }; return $value }
  function Binding($processId) {
    $p=[Diagnostics.Process]::GetProcessById([int]$processId)
    if (![string]::Equals($p.MainModule.FileName,$expectedExe,[StringComparison]::OrdinalIgnoreCase)) { throw 'NATIVE_SCOPE_DENIED' }
    return @{pid=$p.Id;started=$p.StartTime.ToUniversalTime().Ticks.ToString()}
  }
  if ($request.operation -eq 'windows') {
    $windows=@(); $nodes=[System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition)
    foreach ($n in $nodes) { if ($windows.Count -ge 10) { break }; try {
      if ($n.Current.IsOffscreen -or !$n.Current.NativeWindowHandle) { continue }; $b=Binding $n.Current.ProcessId
      $windows+=@{handle=$n.Current.NativeWindowHandle;pid=$b.pid;started=$b.started;label=(Short $n.Current.Name 120)}
    } catch { } }
    @{windows=@($windows)} | ConvertTo-Json -Depth 8 -Compress; exit
  }
  $b=Binding $request.window.pid
  if ($b.started -ne [string]$request.window.started) { throw 'NATIVE_WINDOW_CHANGED' }
  $root=[System.Windows.Automation.AutomationElement]::FromHandle([IntPtr][long]$request.window.handle)
  if ($root.Current.ProcessId -ne [int]$request.window.pid) { throw 'NATIVE_WINDOW_CHANGED' }
  $danger='(?i)\b(save|submit|send|delete|remove|purchase|pay|transfer|publish|approve|authorize|guardar|enviar|eliminar|borrar|comprar|pagar|publicar|aprobar|autorizar|salvar|excluir)\b'
  $secret='(?i)password|passwd|contrase|senha|token|secret|api.?key|credit.?card|tarjeta|cvv|otp'
  $search='(?i)\b(search|find|lookup|buscar|busqueda|búsqueda|pesquisar|procurar)\b'
  function Nodes {
    $q=[Collections.Generic.Queue[object]]::new(); $q.Enqueue($root); $items=@(); $clock=[Diagnostics.Stopwatch]::StartNew(); $walker=[System.Windows.Automation.TreeWalker]::ControlViewWalker
    while ($q.Count -and $items.Count -lt 1000 -and $clock.ElapsedMilliseconds -lt 3500) {
      $n=$q.Dequeue(); $items+=$n
      try { $child=$walker.GetFirstChild($n); while ($child -and $q.Count -lt 1000) { $q.Enqueue($child); $child=$walker.GetNextSibling($child) } } catch { }
    }; return $items
  }
  if ($request.operation -eq 'act') {
    $a=$request.action; $record=$request.ref; $target=$null
    if (!$record -or $a.type -notin @('read','focus','fill','activate','scroll') -or $a.effect -notin @('read','navigate','search')) { throw 'ACTION_POLICY_DENIED' }
    foreach ($n in (Nodes)) { try { if (($n.GetRuntimeId() -join ',') -eq $record.runtime) { $target=$n; break } } catch { } }
    if (!$target -or $target.Current.IsPassword -or $target.Current.IsOffscreen -or !$target.Current.IsEnabled -or $target.Current.Name -ne $record.name -or $target.Current.AutomationId -ne $record.automationId -or $target.Current.ProcessId -ne $root.Current.ProcessId) { throw 'STALE_OBSERVATION' }
    if ($target.Current.Name -match $secret -or (Short $target.Current.ControlType.ProgrammaticName 40) -ne $record.role) { throw 'ACTION_POLICY_DENIED' }
    if ($a.type -eq 'focus') { $target.SetFocus() }
    elseif ($a.type -eq 'fill') {
      if (!$request.allowInteraction -or $target.Current.Name -notmatch $search -or $a.value -isnot [string] -or $a.value.Length -gt 500) { throw 'ACTION_POLICY_DENIED' }; $pattern=$null
      if (!$target.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$pattern) -or $pattern.Current.IsReadOnly -or $pattern.Current.Value -ne $record.value) { throw 'STALE_OBSERVATION' }; $pattern.SetValue([string]$a.value)
    } elseif ($a.type -eq 'activate') {
      if (!$request.allowInteraction -or $target.Current.Name -notmatch $search -or $target.Current.Name -match $danger) { throw 'ACTION_POLICY_DENIED' }; $pattern=$null
      if (!$target.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)) { throw 'UNSUPPORTED_ACTION' }; $pattern.Invoke()
    } elseif ($a.type -eq 'scroll') {
      $pattern=$null; if (!$target.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern,[ref]$pattern)) { throw 'UNSUPPORTED_ACTION' }
      $pattern.Scroll([System.Windows.Automation.ScrollAmount]::NoAmount,[System.Windows.Automation.ScrollAmount]::SmallIncrement)
    }; Start-Sleep -Milliseconds 250
  }
  $elements=@(); $refs=@{}; $texts=@()
  foreach ($n in (Nodes)) {
    if ($elements.Count -ge 120) { break }; try {
      if ($n.Current.IsPassword -or $n.Current.IsOffscreen -or $n.Current.ProcessId -ne $root.Current.ProcessId -or $n.Current.Name -match $secret) { continue }
      $name=Short $n.Current.Name 160; $role=Short $n.Current.ControlType.ProgrammaticName 40; $ref='e'+($elements.Count+1); $actions=@('read'); $value=$null; $pattern=$null
      if ($n.Current.IsEnabled -and $n.Current.IsKeyboardFocusable) { $actions+='focus' }
      if ($n.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern,[ref]$pattern)) { $actions+='scroll' }; $pattern=$null
      if ($n.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$pattern)) { $value=Short $pattern.Current.Value 500; if ($request.allowInteraction -and $name -match $search -and !$pattern.Current.IsReadOnly -and $n.Current.IsEnabled) { $actions+='fill' } }; $pattern=$null
      if ($request.allowInteraction -and $name -match $search -and $n.Current.IsEnabled -and $name -notmatch $danger -and $n.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)) { $actions+='activate' }
      $element=@{ref=$ref;role=$role;name=$name;actions=@($actions)}; if ($null -ne $value) { $element.value=$value }; $elements+=$element
      $refs[$ref]=@{runtime=($n.GetRuntimeId() -join ',');name=$n.Current.Name;automationId=$n.Current.AutomationId;role=$role;value=$value}; if ($name) { $texts+=$name }
    } catch { }
  }
  @{code='OBSERVED';observation=@{revision=[guid]::NewGuid().ToString();text=(Short ($texts -join "`n") 4000);elements=@($elements);capabilities=@('windows-uia','ephemeral-refs','post-observation')};privateRefs=$refs;verified=$false} | ConvertTo-Json -Depth 12 -Compress
} catch { $code=[string]$_.Exception.Message; if ($code -notmatch '^[A-Z_]{1,48}$') { $code='NATIVE_EXECUTOR_UNAVAILABLE' }; @{code=$code;verified=$false} | ConvertTo-Json -Compress }
