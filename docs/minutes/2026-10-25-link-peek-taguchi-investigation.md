# Link Peek 投稿リンクの調査

- 依頼: https://x.com/TaguchiRenta/status/2113764983989584281 で新規タブになる場合と、再読み込み後にプレビュー不可となる場合を調べる。
- Xの公開syndicationデータを確認。投稿には画像リンク https://t.co/QGjKYvQ9fE （展開先は同じ投稿の /photo/1）があり、外部記事リンクは確認できない。
- content.jsはクリックされた実hrefが外部originの場合に横取りする。Xの画像リンクがt.coの場合、同じXへ戻るリンクも外部として扱う可能性がある。現時点では仮説。
- 操作対象が添付画像か別リンクかをユーザーに確認中。対象確定まで実装は行わない。

## リンク確定・再現結果
- ユーザーが対象を https://www.nikkei.com/article/DGXZQOFL234QYTT21C26A0000000/ と指定。先の公開データにはこのリンクが含まれておらず、画像リンクの仮説は対象外だった。
- 記事のHTTP応答は200、Content-Security-Policy: frame-ancestors 'self' を返す。
- Browser plugin not available のため既存のPlaywright/Chromiumで拡張を起動し検証。リンククリック→viewer.html→日経iframeの順で、net::ERR_BLOCKED_BY_RESPONSE、failure=trueを再現。自動で新規タブは生成されなかった。
- 現行のX-Frame-Options除去ではCSPの埋め込み禁止は解除されない。日経のプレビュー不可はこの方式の制限。新規タブになる現象とは区別する。
- CSP全削除は他の保護も削るため、この調査では実装変更をしていない。
