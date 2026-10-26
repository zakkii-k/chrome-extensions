# 両拡張のGitHubリリース

依頼: New Tab LauncherとLink Peekをリリースし、別PCのChrome・Edgeでの導入方法を記載。

方針: ストア公開は既存方針のまま保留。GitHub ReleaseでNew Tab Launcher 0.2.2 / Link Peek 0.1.4を配布。各READMEとルートREADMEにZIP展開・デベロッパーモード・読み込み・手動更新・PowerToysのmsedge.exe設定を明記。CSPヘッダー除去の影響も配布説明に残す。

## 完了
- PR #1のCI成功を確認しmainへマージ。タグnew-tab-launcher/v0.2.2とlink-peek/v0.1.4を作成。
- 両タグのGitHub Actionsで単体・ブラウザ・ZIPテスト成功。配布ZIPを生成し、両方ともdraft=false / prerelease=falseで正式公開。
- リリース本文にChrome・Edgeへの導入、手動更新、PowerToysのchrome.exe/msedge.exe指定、Edge実機未検証を記載。Link PeekのCSPヘッダー除去の影響も記載。
- 公開資産をダウンロードしSHA256SUMSの一致とZIP直下のmanifest.json、バージョンを検証。
- https://github.com/zakkii-k/chrome-extensions/releases/tag/new-tab-launcher/v0.2.2
- https://github.com/zakkii-k/chrome-extensions/releases/tag/link-peek/v0.1.4
