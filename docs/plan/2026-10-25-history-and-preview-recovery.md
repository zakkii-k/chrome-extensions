# 検索履歴とプレビューの復旧

- [x] 作業ブランチfix/search-history-and-preview-recoveryを作成
- [x] 検索前のabout:blank作成を廃止し、ブラウザのNEW_TAB検索へ変更
- [x] 内部画面での表示制限と、本当の実行エラーを区別
- [x] CDP履歴とブラウザ回帰テストで検索結果が唯一の最初の項目になり、Back不可であることを確認
- [x] Link Peekの同期・非同期例外を捕捉し、失効した古い処理はプレビューを閉じて元のクリックへ戻す
- [x] 指定リンクの実ページをChromiumで表示確認（Diaの空白は未再現）
- [x] 全49テストとGitHub CI成功、両拡張をWindowsへ直接配置、コミット・既存PRへ反映
