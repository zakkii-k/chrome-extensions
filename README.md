# New Tab Launcher

Ctrl+Tで入力バーを表示し、Enterで確定してから新しいタブを開くChrome拡張機能です。同じ検索結果・URLが開いていても、既存タブへの切り替えは行いません。元のタブは維持します。

## Windowsで使う

Chrome 127以降、[AutoHotkey v2](https://www.autohotkey.com/)を使用します。拡張機能はビルド・npm install不要です。

1. WSL内のファイルをWindowsから使える場所へコピーします。Windows PowerShellで次を実行してください。

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "\\wsl.localhost\Ubuntu\home\zakki\product\chrome-extension\windows\prepare.ps1"
   ```

   コピー先は `%LOCALAPPDATA%\NewTabLauncher` です。以後コードを変更した場合も、このコマンドで再コピーしてから拡張機能を再読み込みしてください。

2. Chromeの `chrome://extensions` を開き、「デベロッパーモード」を有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」で `%LOCALAPPDATA%\NewTabLauncher\extension` を選択します。`extension` フォルダ自体を選びます。
4. `chrome://extensions/shortcuts` を開き、New Tab Launcherの「検索バーを表示する」を **Ctrl+Shift+Space** に設定します。対象は **Chrome内** にしてください。
5. まずCtrl+Shift+Spaceで検索バーが開くことを確認します。拡張機能アイコンのクリックでも入力できます。
6. AutoHotkey v2をインストールし、`%LOCALAPPDATA%\NewTabLauncher\launcher.ahk` をダブルクリックします。
7. ChromeでCtrl+Tを押します。以後は検索バーが開き、Enterで新規タブへ進みます。

任意で `Win+R` → `shell:startup` に `launcher.ahk` のショートカットを置けば、ログイン時にキー変換が有効になります。終了するときは通知領域のAutoHotkeyアイコンからExitを選択してください。終了すると標準のCtrl+Tに戻ります。Chrome以外のアプリのCtrl+Tは変更しません。

## 操作

- 検索語を入力してEnter：ブラウザ既定の検索エンジンを使い、新しいタブで検索。
- `example.com` や `https://example.com/path` を入力してEnter：新しいタブでURLを開く。スキーム省略時はHTTPS。
- ローカル開発用URLは `http://localhost:3000` のようにHTTPを明示してください。
- Esc／背景クリック：タブを増やさず閉じ、ページの元の入力位置へ戻る。
- Ctrl+Tを再度押す：ページ内の検索バーを閉じる。
- 日本語の変換確定中のEnter：検索は実行しない。変換確定後、もう一度Enterで開く。

通常のWebページでは中央寄りのオーバーレイを表示します。`chrome://`、新しいタブ、Chromeウェブストア、PDFなど拡張機能が注入できないページでは、ツールバーのポップアップに切り替えます。この場合も入力確定前にタブは作りません。アイコンをツールバーへ固定すると見つけやすくなります。

Diaなどでツールバーのポップアップも開けない場合、0.1.1以降は小さな入力用ウィンドウを表示します。Escで閉じると元のブラウザウィンドウにはタブが増えません。Enterで確定すると元のブラウザウィンドウに新規タブを開き、入力用ウィンドウを閉じます。元のウィンドウを先に閉じてしまった場合は、検索を実行せずエラーを表示します。

### 検索バーが出ない場合

1. コピー用PowerShellを再実行し、拡張機能一覧でNew Tab Launcherを再読み込みします。バージョンが **0.1.1** になったことを確認します。
2. 拡張機能のショートカット設定でCtrl+Shift+Spaceが割り当てられ、対象がブラウザ内であることを確認します。
3. 通常のWebページでCtrl+Shift+Spaceを押します。中央のバー、ツールバーのポップアップ、小さな入力用ウィンドウの順で表示を試みます。
4. どれも表示されない場合、拡張機能のエラー詳細に出る `Launcher could not open` の全文を確認します。`page-injection`、`toolbar-popup`、`input-window` ごとの理由が含まれます。

表示に成功した場合も、拡張機能のservice workerのコンソールで `Launcher display` を確認すると、使用した表示方法と、それ以前の失敗理由を確認できます。ログに検索入力そのものは含めません。

## DiaとMac

検索UI・URL判定・タブ生成はOSに依存しません。Mac用の内部ショートカットはCommand+Shift+Spaceです。Command+Tの置換には、Mac側でアプリ単位のキーマッピングを別途用意する必要があります。Mac用キー変換はこの版に含みません。

Diaへの導入は、その環境がChrome互換拡張機能と必要なAPIを提供する場合に限ります。Diaの実機検証は未実施です。WindowsでDiaを利用でき、プロセス名が `dia.exe` であると確認できた場合は、拡張機能の導入・ショートカット設定後に `launcher.ahk` のDia用GroupAdd行を有効にしてください。Chrome以外も、まず拡張機能単独の動作確認をしてからキー変換対象に追加してください。

## 開発と権限

```bash
npm test
```

実行時の依存ライブラリ、サーバー、外部への入力候補取得、履歴保存はありません。検索確定時には通常のブラウザ検索と同様に、入力が既定の検索プロバイダーに渡ります。

- `activeTab`：ショートカットを押したページへの一時的なアクセス。
- `scripting`：ページ内に検索バーを表示。
- `search`：既定の検索エンジンを使用。

常時全サイトへのアクセス権、タブ一覧・閲覧履歴の読み取り権限は要求しません。ショートカットの置換は拡張機能ではなくWindows側のAutoHotkeyが担当します。

公式資料：[Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands)、[Search API](https://developer.chrome.com/docs/extensions/reference/api/search)、[Action API](https://developer.chrome.com/docs/extensions/reference/api/action)、[AutoHotkey v2](https://www.autohotkey.com/docs/v2/)。
