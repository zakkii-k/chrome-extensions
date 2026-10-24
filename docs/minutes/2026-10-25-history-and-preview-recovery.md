# 検索履歴・内部画面のエラー・プレビュー復旧

- 継続指示を受領。前回は自動承認レビューが利用上限で実行されず停止していたが、今回のブランチ作成は成功。
- 検索結果で戻るとabout:blankへ戻るとの報告。先に空白タブを作成してから検索APIのtabIdへ渡している現行処理が原因。NEW_TAB指定のネイティブ検索へ変更する。
- chrome://等での表示失敗はブラウザの制限。HTTPページの実行失敗とは区別し、内部画面では表示不可をバッジで知らせるが未処理エラーとして記録し続けない。
- 前の未完了依頼：Xのlivedoornews投稿2113944842258776155で空白表示、content.jsのpeek:unregisterでExtension context invalidated。対象短縮URLはhttps://t.co/WNdewZ4SK8、転送先はhttps://news.livedoor.com/article/detail/32611452/。これも合わせて調査する。

- New Tab Launcher 0.2.2：NEW_TAB検索の実履歴でcurrentIndex=0かつentryが1件であり、goBack()がnullになることを確認。回帰テストsearch-history.browser.mjsも追加。内部画面の表示不可はsurface=unavailableを返す正常な制限として扱い、console.errorではなくinfoとバッジで通知。HTTPページの真の失敗は従来どおり例外記録する。
- Link Peek 0.1.3：runtime.jsのcreateMessengerで同期throwとPromise拒否の双方を捕捉。context失効後は現在のモーダルを片付けてハンドラを無効化し、以後のクリックはpreventDefaultせず通常動作へ戻す。viewer URLもAPI失効前に取得し、失敗時は空白モーダルを作らない。
- 実際のchrome.runtime.reloadで古いcloseハンドラと次のクリックを操作するブラウザ回帰テストを追加。未処理例外なし、通常のリンクがネイティブタブで開くことを確認。新しいプレビュー処理を使うには元ページの再読み込みが必要。
- ユーザー指定のlivedoor記事は現行のChromiumでfailure=false、記事URLとタイトル・本文文字数3863を確認。Dia上の空白はまだ直接再現できておらず、すべてを解決したとは断定しない。
- Nodeの42テスト、配布ZIP4テスト、ブラウザ3テストが通過。従来のキーボード隔離も維持。

- 最終版でも指定のlivedoor実記事を再検証し、failure=falseと本文文字数3785を確認。New Tab Launcher 0.2.2とLink Peek 0.1.3をWindows側へ直接配置し、バージョンを確認。既存PR #1へ反映しGitHub CIも成功。過去の拡張エラー履歴はブラウザ側に残るため、ユーザー側で削除が必要。
