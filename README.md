# 灯火の継承者（ともしびのけいしょうしゃ）

ブラウザで遊べる見下ろし型アクションRPG。HTML5 Canvas と素の JavaScript（ES Modules）だけで動き、ビルドや外部ライブラリは不要です。

設計・ストーリーは [docs/DESIGN.md](docs/DESIGN.md) を参照。

## 現在の内容（ステップ1：序章 体験版）

- 序章「旅立ち」：ハルネ村（5部屋）→ ボス「大影獣」→ 南門から旅立ちまで
- 移動・3段コンボ攻撃・回避（無敵時間あり）
- 敵「影スライム」：赤く光る予兆のあとに飛びかかる
- ボス「大影獣」：HP が半分を切ると強化し、弾を撃つ
- 部屋の切り替え、NPC・看板との会話、HUD（HP・場所・目的）
- 回復ハートのドロップ、ゲームオーバー → 部屋の入口から再挑戦
- スマホ用の仮想パッドとボタン

## 操作

| 操作 | キーボード | スマホ |
|---|---|---|
| 移動 | WASD／矢印キー | 左のパッド |
| 攻撃・話す・決定 | J／Z／Space（決定は Enter も可） | 攻撃ボタン |
| 回避 | L／X／Shift | 回避ボタン |

## GitHub Pages で公開する

1. リポジトリの **Settings → Pages** を開く
2. **Build and deployment** の Source を「Deploy from a branch」にする
3. Branch に `main`、フォルダに `/ (root)` を選んで保存
4. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で遊べます

## ローカルで動かす

ES Modules を使っているため、`index.html` を直接ダブルクリックしても動きません。簡易サーバーを立ててください。

```sh
python3 -m http.server 8000
# ブラウザで http://localhost:8000/ を開く
```

## ファイル構成

```
index.html            エントリ
css/style.css         レイアウト・スマホ操作UI
js/main.js            ゲームループ・シーン管理・戦闘判定
js/input.js           キーボード／タッチ入力
js/player.js          主人公
js/enemy.js           敵（種類ごとのパラメータ）
js/map.js             部屋・タイル描画・当たり判定
js/ui.js              HUD・会話ウィンドウ・タイトル等
js/effects.js         パーティクル・ダメージ表示
js/sprites.js         キャラクターの描画
data/story.js         会話テキスト
data/maps/prologue.js 序章の部屋データ
```
