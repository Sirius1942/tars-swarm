# TARS-Swarm

TARS-Swarmは、TypeScriptベースのLLMエージェントオーケストレーションフレームワークで、複数のAIエージェント間の協調を構築・管理するためのものです。

## コアコンセプト

### SwarmとAgentの関係

TARS-Swarmのコアアーキテクチャは、2つの主要クラス`Swarm`と`Agent`に基づいています。それらの関係は以下の通りです：

#### 全体アーキテクチャ
- `Swarm`は複数の`Agent`を管理・調整するオーケストレーターです
- `Agent`は単一のAIアシスタントを表す独立したLLMプロキシです
- それらは「1対多」の関係を持ち、1つの`Swarm`が複数の`Agent`を管理できます

#### 責任分担
- `Agent`クラスは以下を担当します：
  - 基本プロパティの定義（名前、モデル、指示など）
  - 関数とツールの管理
  - 入出力の検証
  - 自身のトレースイベントの維持
   
- `Swarm`クラスは以下を担当します：
  - モデルプロバイダーの管理（ModelProvider）
  - LLMとの通信処理
  - 複数エージェント間の調整
  - グローバルトレーシングシステムの管理
  - メッセージ履歴とコンテキスト変数の処理

#### インタラクション方法
```typescript
// Swarmインスタンスの作成
const swarm = new Swarm({
  apiKey: "your-api-key",
  enableTracing: true
});

// Agentインスタンスの作成
const agent = new Agent({
  name: "アシスタント",
  model: "gpt-4o",
  instructions: "あなたは役立つアシスタントです"
});

// SwarmでAgentを実行
const response = await swarm.run(agent, messages, context_variables);
```

#### 主要機能
- `Swarm`が提供する機能：
  - Agentを実行する`run`と`runWithStream`メソッド
  - エージェント間のハンドオフメカニズム
  - 関数呼び出しとツール使用の管理
  - 会話履歴とコンテキストの維持
   
- `Agent`が提供する機能：
  - 指示の管理（`getInstructions`）
  - 関数スキーマの生成（`getFunctionSchemas`）
  - 入出力の検証（`validateInput`/`validateOutput`）
  - イベントの追跡（`addTraceEvent`/`getTraceEvents`）

#### データフロー
```
Swarm
├── ユーザー入力の受信
├── Agentの選択/作成
├── LLMへのリクエスト送信
├── レスポンスの処理
├── 会話履歴の管理
└── 複数エージェントの調整

Agent
├── 動作ルールの定義
├── ツール関数の提供
├── 入出力の検証
└── 自身のイベント記録
```

#### ユースケース
- 単一エージェントシナリオ：Swarmを直接使用して単一のAgentを実行
- マルチエージェント協調：Swarmを通じて複数のエージェント間のインタラクションを調整
- 複雑なワークフロー：Swarmのハンドオフメカニズムを使用してエージェント間でタスクを引き継ぎ

この設計により：
1. 柔軟なエージェント設定と再利用
2. 明確な責任分担
3. 拡張可能なアーキテクチャ
4. 完全なトレーシングとデバッグ機能
5. 複雑なワークフローのオーケストレーション

## インストール

```bash
npm install tars-swarm
```

## クイックスタート

```typescript
import { Swarm, Agent } from 'tars-swarm';

// Swarmインスタンスの作成
const swarm = new Swarm({
  apiKey: "your-api-key"
});

// Agentの作成
const agent = new Agent({
  name: "アシスタント",
  model: "gpt-4o",
  instructions: "あなたは役立つアシスタントです"
});

// 会話の実行
const response = await swarm.run(
  agent,
  [{ role: "user", content: "こんにちは！" }]
);

// レスポンスの取得
console.log(response.messages[response.messages.length - 1].content);
```

## 機能

- 🤖 複数のLLMエージェントの協調をサポート
- 🔄 エージェント間のハンドオフメカニズム
- 🛡️ 組み込みの入出力検証
- 📊 完全なトレーシングとデバッグ機能
- 🔧 拡張可能なツールと関数システム
- 📝 ストリーミング出力のサポート
- 🎯 コンテキスト変数の管理

## サンプル

`examples`ディレクトリでより多くのサンプルを確認できます：

- `basic.ts`: 基本的な使用例
- `handoff.ts`: エージェントハンドオフの例
- `tracing.ts`: トレーシング機能の例

## ライセンス

このプロジェクトはMITライセンスの下で公開されています - 詳細は[LICENSE](LICENSE)ファイルをご覧ください。 