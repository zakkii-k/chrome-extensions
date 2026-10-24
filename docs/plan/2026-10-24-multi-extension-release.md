# 複数拡張の管理と初回リリース案

- [x] 現在のGit構成・ファイル構成を確認（リモート未設定、単一拡張、0.2.0）
- [x] 1リポジトリ内で拡張ごとにフォルダを分ける構成を提案
- [x] GitHub公開とChromeウェブストア公開を分けて説明
- [x] 公開リポジトリ＋GitHub Releasesで試用版公開、ストアは保留と決定
- [x] 拡張をextensions/new-tab-launcherへ移動し、テスト・コピー手順を更新
- [x] 拡張単位のパッケージ生成とCIを追加
- [x] GitHub向けCHANGELOG・PRIVACY・導入手順を整備
- [ ] ライセンスの選定（未指定のため再利用許諾を新設しない）
- [ ] ストア画像とアイコン（ストア公開まで保留）
- [ ] 拡張単位のタグと配布ZIPを作成
- [ ] GitHubリポジトリ接続・公開
- [ ] ストアへ登録・審査提出（ストア公開を選んだ場合）

## 推奨構成

1つのchrome-extensionsリポジトリで、extensions/new-tab-launcher/{src,tests,windows,README.md,CHANGELOG.md,PRIVACY.md}のように拡張単位で分離する。ビルド済みZIPはdist配下に生成する。共通パッケージは重複が生じてから抽出。Git submodule・入れ子の.gitは採用しない。

リリースはnew-tab-launcher/v0.2.0のような拡張単位のタグ。各拡張のmanifestバージョンは独立。Chromeウェブストア用ZIPはmanifest.jsonがルートになるように生成し、Windows用キー変換などは別の利用者向け配布物として用意する。

ユーザーからpublicでGitHubリポジトリ作成・リリースまで実行する指示を受領。ストアは保留。chore/monorepo-first-releaseブランチで準備。CLI認証は有効でブラウザログインは不要。
