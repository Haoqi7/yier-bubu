!macro customInstall
  ${If} ${RunningX64}
    ReadRegDWord $R0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
    IfErrors +3
    ${If} $R0 < 1
      ExecWait '"$INSTDIR\resources\vc_redist.x64.exe" /install /quiet /norestart'
    ${EndIf}
  ${Else}
    ReadRegDword $R0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x86" "Installed"
    IfErrors +3
    ${If} $R0 < 1
      ExecWait '"$INSTDIR\resources\vc_redist.x86.exe" /install /quiet /norestart'
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
!macroend
