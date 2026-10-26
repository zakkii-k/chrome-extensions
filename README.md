# Chrome Extensions

Chrome・Edge・DiaなどのChromiumブラウザ向け拡張機能を管理するリポジトリです。拡張ごとにソース、テスト、ドキュメント、バージョンを分けて管理します。

| 拡張 | 内容 | バージョン |
| --- | --- | --- |
| [Link Peek](extensions/link-peek/) | 外部リンクをページ内で一時表示し、拡大時だけタブへ移動 | [0.1.4](https://github.com/zakkii-k/chrome-extensions/releases/tag/link-peek/v0.1.4) |
| [New Tab Launcher](extensions/new-tab-launcher/) | ページ上で検索し、確定してから新規タブへ移動 | [0.2.2](https://github.com/zakkii-k/chrome-extensions/releases/tag/new-tab-launcher/v0.2.2) |

## ダウンロード・別PCでの導入

Chromeウェブストア・Edgeアドオンストアでは公開していません。GitHub ReleasesのZIPを展開して読み込みます。Node.js・Python・ビルドは不要です。

| 拡張 | リリース | Chrome・Edgeの導入手順 |
| --- | --- | --- |
| Link Peek | [0.1.4](https://github.com/zakkii-k/chrome-extensions/releases/tag/link-peek/v0.1.4) | [手順](extensions/link-peek/README.md#別pcのchromeedgeに入れるwindows) |
| New Tab Launcher | [0.2.2](https://github.com/zakkii-k/chrome-extensions/releases/tag/new-tab-launcher/v0.2.2) | [手順](extensions/new-tab-launcher/README.md#別pcのchromeedgeに入れるwindows) |

各リリースの **Assets → `*-extension.zip`** をダウンロードし、常用するフォルダへ展開。`chrome://extensions` または `edge://extensions` でデベロッパーモードをオンにし、`manifest.json` があるフォルダを読み込みます。元ページも再読み込みしてください。展開フォルダは削除しないでください。更新は手動です。

`*-windows.zip` は本体・README・任意の配置用PowerShell等を含む一式です。`SHA256SUMS` も添付します。

New Tab LauncherはCtrl+Shift+Spaceで開きます。Ctrl+Tへ置き換える場合はPowerToysのKeyboard Managerで、対象アプリをChromeは `chrome.exe`、Edgeは `msedge.exe` に設定します。[設定手順](extensions/new-tab-launcher/README.md#powertoysでctrltを置き換える)

Link Peek 0.1.4は、プレビュー応答のCSPヘッダーを外して埋め込み禁止に対応します。そのプレビュー内ではnonce・スクリプト許可元などCSPヘッダーによる保護も外れます。通常タブには適用しません。[詳細](extensions/link-peek/PRIVACY.md)

## 開発

Node.js 22以降、npm、Python 3を使用します。Pythonは配布ZIPの生成と検証にのみ使用し、拡張機能の利用には不要です。

```bash
npm ci
npm test
npm run package
npm run check:packages
```

検索UIのキー入力を検証するブラウザテストも実行できます。テスト専用Chromiumは利用者向けZIPには含まれません。

```bash
npx playwright install --with-deps chromium
npm run test:browser
```

拡張を1つだけパッケージする場合：

```bash
python3 scripts/package_extensions.py new-tab-launcher
```

ZIPは `dist/` に生成されます。拡張機能本体のZIP直下には `manifest.json` が入り、テストや開発用ファイルは含まれません。

## 構成とリリース

```text
extensions/<extension-name>/
  src/            拡張機能本体
  tests/          自動テスト
  windows/        Windows向け補助ツール（必要な拡張のみ）
  README.md       導入手順
  CHANGELOG.md    変更履歴
  PRIVACY.md      入力やタブ情報の扱い
scripts/          パッケージ生成と検証
.github/workflows/ 自動テストと配布物の生成
```

バージョンは拡張ごとの `src/manifest.json` と `package.json` で合わせます。タグは `new-tab-launcher/v0.2.0` の形式です。タグをpushするとGitHub Actionsがテスト・ZIP生成を行い、配布物を含むドラフトリリースを作成します。内容確認後に公開します。

独立した `.git` やGit submoduleは使いません。新しい拡張は `extensions/` に追加します。
