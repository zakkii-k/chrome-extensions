# Chrome Extensions

Chrome・DiaなどのChromiumブラウザ向け拡張機能を管理するリポジトリです。拡張ごとにソース、テスト、ドキュメント、バージョンを分けて管理します。

| 拡張 | 内容 | バージョン |
| --- | --- | --- |
| [Link Peek](extensions/link-peek/) | 外部リンクをページ内で一時表示し、拡大時だけタブへ移動 | 0.1.2（開発中） |
| [New Tab Launcher](extensions/new-tab-launcher/) | ページ上で検索し、確定してから新規タブへ移動 | 0.2.1（開発中） |

## ダウンロード

[GitHub Releases](https://github.com/zakkii-k/chrome-extensions/releases)から取得できます。現在は試用版をGitHubで配布しています。Chromeウェブストアでは公開していません。

- `new-tab-launcher-0.2.0-extension.zip`：拡張機能本体。展開したフォルダをブラウザに読み込みます。
- `new-tab-launcher-0.2.0-windows.zip`：本体、導入手順、PowerShellコピー用スクリプト、任意のAutoHotkeyスクリプトを同梱。
- `SHA256SUMS`：配布物のSHA-256チェックサム。

Ctrl+Tへの割り当てはPowerToys等で別途設定します。拡張機能だけで使う場合はCtrl+Shift+Spaceです。詳しくは[導入手順](extensions/new-tab-launcher/README.md)を参照してください。

## 開発

Node.js 22以降、npm、Python 3を使用します。Pythonは配布ZIPの生成と検証にのみ使用し、拡張機能の利用には不要です。

```bash
npm ci
npm test
npm run package
npm run check:packages
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
