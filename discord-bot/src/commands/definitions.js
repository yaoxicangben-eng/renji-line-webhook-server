import { SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("today")
    .setDescription("今日の業務一覧を表示します。"),
  new SlashCommandBuilder()
    .setName("customer")
    .setDescription("顧客カルテを表示します。")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("本名または表示名")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("memo")
    .setDescription("顧客メモをタスク管理へ保存します。")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("本名または表示名")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("content").setDescription("メモ内容").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("reply")
    .setDescription("公式LINE返信案を生成します。自動送信はしません。")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("本名または表示名")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("consultation")
        .setDescription("相談内容")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("rewrite_line")
    .setDescription("顧客が彼へ送るLINE文面を添削します。")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("本名または表示名")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("message").setDescription("LINE文面").setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("brief")
    .setDescription("通話前ブリーフィングを生成します。")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("本名または表示名")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("彼との現在地と次の一手を整理します。")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("本名または表示名")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("返信文の作り方ルールを記録します。")
    .addStringOption((option) =>
      option
        .setName("target")
        .setDescription("反映先")
        .setRequired(true)
        .addChoices(
          { name: "LINE返信案", value: "reply" },
          { name: "LINE添削", value: "rewrite_line" },
          { name: "通話前ブリーフィング", value: "brief" },
          { name: "全体", value: "all" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("content")
        .setDescription("今後守るルール・フィードバック")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("example")
        .setDescription("任意: 良い例や悪い例")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("aftercall")
    .setDescription("通話文字起こしを要約して通話メモへ保存します。")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("本名または表示名")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("session")
        .setDescription("第何回の通話か")
        .setRequired(true)
        .setMinValue(1),
    )
    .addStringOption((option) =>
      option
        .setName("transcript")
        .setDescription("通話文字起こし、または要点メモ")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("recording_url")
        .setDescription("任意: 録画URL")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("risk")
    .setDescription("顧客の返金・不満・依存などのリスクを確認します。")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("本名または表示名")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("note")
        .setDescription("任意: 今気になる発言や状況")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("knowledge")
    .setDescription("良い返信・失敗例・対応ルールをナレッジ化します。")
    .addStringOption((option) =>
      option
        .setName("content")
        .setDescription("保存したい内容")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("カテゴリ")
        .setRequired(false)
        .addChoices(
          { name: "良い返信", value: "良い返信" },
          { name: "失敗例", value: "失敗例" },
          { name: "顧客タイプ別対応", value: "顧客タイプ別対応" },
          { name: "商品改善", value: "商品改善" },
          { name: "その他", value: "その他" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("任意: 関連する顧客名")
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("reuse_monthly")
        .setDescription("月守りサポートへ転用できる内容か")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("sync")
    .setDescription("顧客情報の読み取り状況を確認します。")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("本名または表示名")
        .setRequired(true),
    ),
];

export const commandData = commands.map((command) => command.toJSON());
