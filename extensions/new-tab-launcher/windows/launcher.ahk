#Requires AutoHotkey v2.0
#SingleInstance Force

; Add a browser here only AFTER installing the extension in that browser.
GroupAdd "LauncherBrowsers", "ahk_exe chrome.exe"
; GroupAdd "LauncherBrowsers", "ahk_exe dia.exe"

; Intercept Ctrl+T only when a configured browser is in the foreground.
#HotIf WinActive("ahk_group LauncherBrowsers")
$^t:: {
    Send "^+{Space}"
    KeyWait "t"
}
#HotIf
