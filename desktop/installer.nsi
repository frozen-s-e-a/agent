; 审计助手安装包（NSIS）。由 desktop/package.mjs 调用 makensis 生成，参数：
;   VERSION      版本号；VERSION_NUM 四段数字版本
;   SRC          打好的程序文件夹
;   OUTFILE      安装包路径
;   REMOVE_NSH   打包时生成的 RemoveAppFiles 宏：程序文件夹顶层的各项
;   ICON         图标
;   SIZE_KB      安装后大小
;
; 装到当前用户的 %LOCALAPPDATA%\Programs\AuditAgent，不要管理员权限；建桌面和开始菜单快捷方式。
; 卸载只删程序文件，项目、对话和设置（%LOCALAPPDATA%\AuditAgent）保留。

Unicode true
!include "MUI2.nsh"
!include "${REMOVE_NSH}"

!define PRODUCT "审计助手"
!define EXE "审计助手.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\AuditAgent"

Name "${PRODUCT}"
Caption "${PRODUCT} ${VERSION} 安装"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\AuditAgent"
InstallDirRegKey HKCU "${UNINST_KEY}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64
ManifestDPIAware true
BrandingText "${PRODUCT} ${VERSION}"

!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "启动${PRODUCT}"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"

VIProductVersion "${VERSION_NUM}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "ProductName" "${PRODUCT}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "FileDescription" "${PRODUCT} 安装程序"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "LegalCopyright" ""

; 程序还开着时（程序文件被占用）请用户先关掉，否则文件替换不了
!macro WaitAppClosed
  IfFileExists "$INSTDIR\${EXE}" 0 +7
    ClearErrors
    FileOpen $0 "$INSTDIR\${EXE}" a
    IfErrors 0 +3
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "${PRODUCT}还开着，请先关掉它再点“重试”。" IDRETRY -3
      Abort
    FileClose $0
!macroend

Section "安装"
  !insertmacro WaitAppClosed
  SetOutPath "$INSTDIR"
  ; 升级时先删掉旧版本的程序文件，免得留下旧文件
  !insertmacro RemoveAppFiles
  File /r "${SRC}\*"
  WriteUninstaller "$INSTDIR\卸载${PRODUCT}.exe"

  CreateShortcut "$DESKTOP\${PRODUCT}.lnk" "$INSTDIR\${EXE}"
  CreateShortcut "$SMPROGRAMS\${PRODUCT}.lnk" "$INSTDIR\${EXE}"

  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${PRODUCT}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\卸载${PRODUCT}.exe"'
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" ${SIZE_KB}
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  !insertmacro WaitAppClosed
  !insertmacro RemoveAppFiles
  Delete "$INSTDIR\卸载${PRODUCT}.exe"
  RMDir "$INSTDIR"
  Delete "$DESKTOP\${PRODUCT}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT}.lnk"
  DeleteRegKey HKCU "${UNINST_KEY}"
SectionEnd
