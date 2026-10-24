# 複数拡張の管理と公開に関する相談

- ユーザーは今後作成する複数の拡張をchrome-extensionsリポジトリで統合管理したい。拡張ごとのリポジトリ分割やサブリポジトリの是非、ghでのリポジトリ作成とリリース方針を質問。
- 現在はリモートなし、ブランチfeat/minimal-overlay-suggestions、検索ランチャー0.2.0のみ。GitHub・Chromeウェブストアへ未公開。
- 一人で作る関連拡張を統合管理する現在の用途には、1リポジトリ内で拡張ごとにフォルダを分け、バージョンとリリースを独立させる構成を推奨。submoduleは不要。
- 所有者・アクセス権・開発体制が分かれる場合は別リポジトリへ分離できる。現時点では共通化を先行させない。
- Chrome公式の公開手順・ZIPのmanifestルート要件・プライバシー申告を確認。検索ランチャーは入力途中のGoogle候補取得とタブ権限の説明、ストア用アイコン等の準備が必要。Ctrl+Tは別途OS側の設定が必要な点を公開説明に記載する。
- GitHubリポジトリ作成・公開操作は未実施。公開範囲と初回の配布先は未決定。

- ユーザーが公開リポジトリでの作成・GitHubリリースの実行を了承。ストア公開は保留。gh CLIの認証はネットワーク制約外で有効と確認でき、ブラウザ認証は不要。
- chore/monorepo-first-releaseでフォルダを拡張単位へ整理。旧windows/prepare.ps1は互換呼び出しとして残す。GitHub用の導入手順・CHANGELOG・PRIVACYを作成。独自のライセンス付与はユーザー未指定のため追加しない。

- 拡張をextensions/new-tab-launcherへ移動し、npm workspacesを設定。Python標準ライブラリによる拡張別ZIP生成、チェックサム、CI、タグpush時のドラフトリリース作成を追加。
- ローカルの拡張テスト20件、配布ZIPの統合テスト3件、配布ZIPからのChromium操作テストが通過。Windowsの新しいprepare.ps1も実行確認済み。
- 初回CIでは拡張の一括検出がsrcを拡張名と取り違える不具合を検出。fix/package-autodiscoveryで修正と回帰テストを追加し、mainへfast-forward反映。修正後のGitHub CIは成功。
- https://github.com/zakkii-k/chrome-extensions をpublicで作成し、mainをpush。リリースタグnew-tab-launcher/v0.2.0を作成。GitHub Actionsがドラフトと本体ZIP・Windows用ZIP・SHA256SUMSを生成。添付物を取得しチェックサム・内容を検証してから、公開済み試用版へ変更した。
- 公開URL：https://github.com/zakkii-k/chrome-extensions/releases/tag/new-tab-launcher/v0.2.0
- gh認証が利用できたためブラウザ操作は不要。Chromeウェブストアには公開していない。
