# New Tab Launcher

Ctrl+Tでページ上に検索欄を表示し、入力してから新規タブへ進むランチャーです。別のアプリウィンドウは開きません。

- 入力してEnter：同じURLのタブがあっても新規タブで検索・移動。
- ↓／↑：候補を選択。検索候補は新規タブ、既存タブ候補を選んだ場合だけそのタブに切り替え。
- Esc／背景クリック／ショートカット再入力：閉じる。
- 日本語変換のEnter：変換確定のみ。次のEnterで実行。

検索結果にはブラウザ既定の検索エンジンを使います。入力候補はGoogleのサジェストとローカルの既存タブから取得します。既存タブのタイトルやURLは外部へ送信しません。

## Windowsで導入・更新

Chrome 127以降、または対応するChromiumブラウザを使用します。ビルド・npm installは不要です。

1. [Releases](https://github.com/zakkii-k/chrome-extensions/releases)から `new-tab-launcher-0.2.0-windows.zip` をダウンロードし、ZIPを展開します。中の `new-tab-launcher` フォルダでWindows PowerShellを開き、次を実行します。

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\windows\prepare.ps1
   ```

   Gitでこのリポジトリを取得した場合は、`extensions/new-tab-launcher` フォルダ内で同じコマンドを実行できます。スクリプトはファイルを `%LOCALAPPDATA%\NewTabLauncher` へコピーするだけで、ソフトウェアのインストールや常駐起動は行いません。

2. `chrome://extensions`（Diaでは `dia://extensions`）でデベロッパーモードを有効にし、`%LOCALAPPDATA%\NewTabLauncher\extension` を読み込みます。更新時は再読み込みし、**0.2.2** と表示されることを確認します。
3. サイトへのアクセスとタブ情報を読む権限が追加されています。更新で無効になった場合は、権限を確認して有効化してください。拡張機能のサイトアクセスは「すべてのサイト」にします。
4. `chrome://extensions/shortcuts`（Diaでは `dia://extensions/shortcuts`）で「検索バーを表示する」に **Ctrl+Shift+Space** を設定し、対象をブラウザ内にします。
5. Webサイト上でCtrl+Shift+Spaceを試します。拡張機能アイコンからも入力できます。
6. Ctrl+Tにする場合、[AutoHotkey v2](https://www.autohotkey.com/)をインストールし、`%LOCALAPPDATA%\NewTabLauncher\launcher.ahk` を起動します。Diaでは先にプロセス名を確認し、スクリプトのDia用GroupAdd行を有効にしてください。

自動起動する場合は `Win+R` → `shell:startup` にAHKファイルのショートカットを置きます。終了は通知領域のAutoHotkeyアイコンからExit。終了すると標準のCtrl+Tに戻ります。

## PowerToysでCtrl+Tを置き換える

AutoHotkeyの代わりに、PowerToysのKeyboard Managerでも設定できます。「ショートカットの再マップ」で次の2行を追加します。

| 入力 | 送信先 | 対象アプリ |
| --- | --- | --- |
| Ctrl+T | Ctrl+Shift+Space | dia.exe |
| Ctrl+T | Ctrl+Shift+Space | chrome.exe |

アプリ名は実行プロセス名を指定します。Diaのプロセス名が異なる場合はタスクマネージャーの「詳細」で確認してください。対象アプリを空欄にすると全アプリへ適用されます。PowerToysを起動してKeyboard Managerを有効にしている間だけ動作します。AutoHotkeyとの併用は不要です。

[Microsoft公式手順](https://learn.microsoft.com/en-us/windows/powertoys/keyboard-manager)

## 動作範囲

HTTP/HTTPSのWebページ上には中央寄りのオーバーレイを表示します。Chrome/Diaの設定画面・組み込みの新しいタブ・Chromeウェブストアなど、ブラウザがスクリプト注入を禁止するページでは同じ表示を作れません。その場合はツールバーの拡張機能ポップアップを試します。Diaがそれも開けない場合は別ウィンドウを作らず、拡張機能アイコンに `!` を表示します。アイコンの手動クリックから利用してください。

Diaでのページ内表示は0.2.0でサイト権限を付けて対応しました。ユーザーのDia実機でもGoogle上での表示・見た目・検索が確認済みです。すべてのブラウザ内部画面でもArcと同じ表示にするには、拡張機能APIを超えるOS側の表示機構が必要になります。この版には含みません。

Macでも拡張機能本体は共用できます。内部ショートカットはCommand+Shift+Spaceです。Command+Tの変換は別途Mac側の設定が必要です。

## 候補と権限

- `tabs`：既存タブのタイトル・URLを候補表示し、明示選択時に切り替える。
- `scripting`、HTTP/HTTPSのサイトアクセス：ページ上に入力UIを表示。Diaで一時的なactiveTab権限が使えない場合にも対応。
- `search`：既定の検索エンジンで結果を開く。

Googleのサジェスト取得には公開エンドポイントを利用します。公式の保証された拡張機能向けAPIではないため、利用できない場合もあります。入力を180ms遅延して取得し、通信時のCookieは送信しません。空入力、URL、メールアドレス形式、スキーム付き文字列は候補取得先へ送りません。検索語は入力途中からGoogleへ送信されます。候補取得に失敗しても検索と既存タブ候補は利用できます。アプリ内で入力履歴を保存しません。

ローカル開発URLは `http://localhost:3000` のようにHTTPを明示してください。スキーム省略時はHTTPSです。

## 開発

リポジトリルートから `npm test`、またはこのフォルダ内から次を実行します。

```bash
npm test
```

実行時の外部ライブラリやサーバーは不要です。表示失敗時はservice workerの `Launcher display` または `Launcher could not open` から、ページ注入とツールバーポップアップの段階別情報を確認できます。ログに検索入力は出力しません。

公式資料：[Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)、[Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)、[Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands)、[Search API](https://developer.chrome.com/docs/extensions/reference/api/search)。

[変更履歴](CHANGELOG.md) · [プライバシー](PRIVACY.md)

## ページのショートカットとの分離

検索欄はページ内の独立した拡張機能フレームに表示します。入力中のキーは背後のWebページへ伝わらず、Xのn等のページ側ショートカットを起動しません。Ctrl+C/V/A、削除、日本語変換は通常の入力欄として使用できます。Escで検索を閉じると元の入力位置に戻り、ページのショートカットも利用できます。ブラウザやOSが処理するショートカットを全面的に無効化する仕組みではありません。
