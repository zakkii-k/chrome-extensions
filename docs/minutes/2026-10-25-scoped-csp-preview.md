# プレビュー限定CSP例外

## 依頼
ユーザーはプレビュー表示中だけ応答ヘッダーを変更して埋め込み禁止を回避する実装を許可。CSPを事前検証する案およびnonceの影響について質問。

## 方針
- Chrome公開DNR APIのModifyHeaderInfoはremove/set/appendと固定valueのみ。Chromium mainにはnodocのregex属性があるが、安定公開APIとして依存しない。
- 既存のsession ruleにContent-Security-Policy削除を追加。tabIds、extension initiator、sub_frameの条件を維持し、通常トップレベル表示・他タブ・サイト開始iframeに適用しない。
- nonceはCSPの許可条件。ヘッダー削除でnonce不一致が生じるというより、その制限自体が外れる。事前の静的な確認では、実行中の全スクリプトの安全性は検証できない。
- CSP全体を外すためヘッダー内のscript-srcやTrusted Typesなどの保護も外れる。HTML meta由来のCSP、iframe sandbox、同一生成元制約、Cookie設定は維持。
- Browser plugin not available。既存のPlaywright/Chromiumでユーザーフローを検証する。

## 実装・検証結果
- frameRuleの一時除去対象にcontent-security-policyを追加。新たな権限なし。バージョン0.1.4へ更新しREADME・Privacy・Changelogへ影響を記載。
- 実ブラウザfixture: frame-ancestors self + XFO SAMEORIGIN + nonce制限を返す記事がプレビューで表示。nonce付きスクリプト実行、CSP除去でnonceなしスクリプトも実行される影響を確認。
- 同時に開いた通常タブはnonceなしスクリプトを拒否。同じ元タブのサイト開始iframeも埋め込み拒否を維持。クリックで新規タブを自動生成しない。Escで閉じるとsession ruleが空になることを検証。
- Chromiumで指定日経記事がfailure=false、記事見出し・本文を表示（会員制限は維持）。NHKニューストップもfailure=falseで見出しを表示。スクリーンショット /tmp/link-peek-nikkei-repro.png と /tmp/link-peek-nhk-repro.png。
- npm test、全ブラウザ回帰テスト、Pythonパッケージテスト4件、ビルド、git diff --check成功。外部記事内の一部計測iframeは自身のCSPで引き続き拒否されるが、本文の表示は成功。Diaそのものは未検証。
- Windowsの既存配置 C:\Users\zakki\AppData\Local\LinkPeek\extension へWSLからコピー、manifest 0.1.4を確認。適用には拡張と元ページの再読み込みが必要。

## API制約・再設定の説明
- 追加質問: なぜ部分削除できないか、事前取得して加工・再設定とは何か。
- Chrome公開DNRの変更操作はヘッダー単位のremove/set/append。受信した値から特定ディレクティブだけを加工して返すコールバックはない。通常のMV3ではwebRequestBlockingも使えない（管理ポリシー配布は例外）。
- 仮案の再設定とは、事前リクエストでCSPを取得しframe-ancestorsを除き、次回iframeリクエストに固定文字列としてsetすること。別応答でnonceがAAA→BBBと変われば、古いAAAを設定したヘッダーと新しいBBBを持つHTMLが不一致になる。同一応答のヘッダーと本文を扱えればこのnonce問題は生じないため、原理的不可能とは区別する。

## 保存応答の再表示・重複ディレクティブ
- 同じ応答のHTMLとCSPを保存・再利用すればnonceの組の不一致は避けられる。ただし通常のMV3拡張には元サイトのURL/originのまま任意の応答本文を差し替える公開APIがなく、srcdoc/blobでの再表示はorigin、Cookie、fetch、相対URL、selfの意味や親CSPの継承等が変わる。一般サイトの完全互換手段とはならない。
- 同一ポリシー内で重複したframe-ancestorsは最初が有効。複数のCSPポリシー（複数ヘッダーやカンマ区切り）ではすべて同時適用し、追加の緩いポリシーで元の制限を緩和できない。metaのframe-ancestorsは無効。
