import { checkNgExpressions } from "./safety.js";
import { limitText } from "../utils/text.js";

function extract(pattern, text, fallback = "") {
  const match = text.match(pattern);
  return match?.[1]?.trim() || fallback;
}

function extractName(text) {
  return extract(/名前:\s*(.+)/, text, "お客様").replace(/さん$/, "");
}

function extractConsultation(text) {
  return extract(/相談内容:\n([\s\S]*?)(?:\n\n過去のフィードバック|$)/, text, "");
}

function extractLineMessage(text) {
  return extract(/LINE文面:\n([\s\S]*?)(?:\n\n過去のフィードバック|$)/, text, "");
}

function extractTranscript(text) {
  return extract(/文字起こし:\n([\s\S]*?)(?:\n\n過去のフィードバック|$)/, text, "");
}

function extractCurrentLevel(text) {
  return extract(/現在地レベル:\s*(.+)/, text, "未設定");
}

function extractAnxietyType(text) {
  return extract(/不安タイプ:\s*(.+)/, text, "未設定");
}

function extractFeedbackRules(text) {
  const match = text.match(/過去のフィードバックとして、次のルールを必ず守る:\n([\s\S]+)$/);
  if (!match) {
    return [];
  }
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function extractObsidianSituation(text) {
  return extract(/Obsidian顧客状況メモ:\n([\s\S]*?)(?:\n+相談内容:|\n+LINE文面:|\n+第何回:|\n+過去のフィードバック|$)/, text, "");
}

function hasRule(rules, pattern) {
  return rules.some((rule) => pattern.test(rule));
}

function situationSentence(situation) {
  if (/我慢でき|控えられ|落ち着|自信/.test(situation)) {
    return "前回よりも、すぐに動かず一度立ち止まれている点はちゃんと前進です。";
  }
  if (/不安|焦り|確認行動|追いLINE/.test(situation)) {
    return "不安が強くなると確認したくなる流れが出やすいので、今日もまずは一度立ち止まることを優先しましょう。";
  }
  return "";
}

export function generateTemplateText(promptName, userContent) {
  const name = extractName(userContent);
  const feedbackRules = extractFeedbackRules(userContent);

  if (promptName === "line_reply.md") {
    const consultation = extractConsultation(userContent);
    const situation = extractObsidianSituation(userContent);
    const progressSentence = situationSentence(situation);
    const paragraphs = [
      `${name}さん、ここまで一人で抱えながらも、ちゃんと状況を整理しようとしているのが伝わってきます。`,
      "",
      progressSentence,
      progressSentence ? "" : "",
      `今は「相手の反応を早く確かめたい気持ち」と「これ以上こじらせたくない気持ち」がぶつかりやすい時期です。${limitText(consultation, 120) || "相手との距離感を丁寧に見直す場面"}という不安が出ている時ほど、すぐに答えを取りにいくより、関係を悪化させない一手を選ぶことが大切です。`,
      "",
      "断定はできませんが、今の彼は感情をすぐ言葉にするより、距離感や負担感で反応が変わりやすい状態として見ておくのが安全です。",
      "",
      "今日は追加で追いLINEをせず、送るなら短く、責めず、返事を求めすぎない文面に整えましょう。",
      "",
      "今すぐ結果を決めにいかなくて大丈夫です。まずは関係を悪化させない一手を選びましょう。",
    ];

    if (hasRule(feedbackRules, /短く|簡潔|短め/)) {
      return [
        `${name}さん、不安な中でも状況を整理しようとしているのが伝わってきます。`,
        "",
        progressSentence,
        progressSentence ? "" : "",
        "今は相手の反応を急いで確かめたくなりやすい時期ですが、ここで追いLINEを重ねると、彼に負担として伝わる可能性があります。",
        "",
        "今日は追加で送らず、少し時間を置きましょう。今すぐ結果を決めにいかなくて大丈夫です。",
      ].filter((line, index, lines) => line || lines[index - 1]).join("\n");
    }

    return paragraphs.filter((line, index, lines) => line || lines[index - 1]).join("\n");
  }

  if (promptName === "rewrite_line.md") {
    const message = extractLineMessage(userContent);
    const ng = checkNgExpressions(message);
    return [
      "送るべきか",
      "今すぐ送るより、感情が落ち着いてから短文に整えて送る方が安全です。",
      "",
      "重い表現",
      ng.ok
        ? "強いNG表現は見当たりません。ただし、長文・確認要求・不安のぶつけすぎには注意してください。"
        : `要注意: ${ng.hits.join(" / ")}`,
      "",
      "修正文",
      "この前はありがとう。少し落ち着いて考えられました。無理に返事はいらないので、また話せそうな時に連絡ください。",
      "",
      "送信タイミング",
      "夜遅くや感情が強い直後は避け、翌日の日中に送るのが無難です。",
      "",
      "送信後の注意",
      "送った後は反応を確認し続けず、追加メッセージは控えてください。",
      "",
      `元文: ${limitText(message, 180)}`,
    ].join("\n");
  }

  if (promptName === "call_brief.md") {
    return [
      "前回要点",
      "直近の相談・通話メモを確認し、相手の反応よりも本人の不安行動に注目します。",
      "",
      "直近相談",
      "LINE相談履歴の最新内容を起点に、追いLINE・確認要求・自爆行動の有無を確認します。",
      "",
      "現在地",
      "現在地レベルと不安タイプが未設定なら、今回の通話で必ず仮判定します。",
      "",
      "今回聞く質問",
      "- 最後に彼と自然に話せたのはいつか",
      "- 今いちばん怖いことは何か",
      "- 送ろうとしているLINEや行動はあるか",
      "",
      "今日のゴール",
      "次の一手を1つに絞り、やらない行動も明確にします。",
      "",
      "注意点",
      "復縁保証や相手の気持ちの断定は避け、見立てとして伝えてください。",
    ].join("\n");
  }

  if (promptName === "status.md") {
    const situation = extractObsidianSituation(userContent);
    const consultation = extractConsultation(userContent);
    const currentLevel = extractCurrentLevel(userContent);
    const anxietyType = extractAnxietyType(userContent);
    const source = `${situation}\n${consultation}`;
    const needsPause = /追いLINE|返信|不安|確認|焦り|返事/.test(source);
    return [
      "現在地レベル",
      currentLevel === "未設定"
        ? "未設定です。直近相談を見る限り、まずは「反応待ち・距離感調整中」として仮置きするのが安全です。"
        : currentLevel,
      "",
      "そう見る理由",
      needsPause
        ? "相手の反応を早く確認したい不安が出ており、ここで動きすぎると負担感として伝わる可能性があります。"
        : "直近情報だけでは断定できません。相手の言葉より、返信頻度・会話の温度感・本人の不安行動を見て判断する段階です。",
      "",
      "いま障害になっていること",
      anxietyType === "未設定"
        ? "不安タイプが未設定です。次回対応で、確認行動・自責・怒り・我慢のどれが強いか確認してください。"
        : `${anxietyType}が強く出ると、相手の反応を待つ時間が苦しくなりやすい点です。`,
      "",
      "今やると悪化しやすいNG行動",
      "- 返事を急かす",
      "- 長文で不安をぶつける",
      "- 彼の気持ちを確認しようとする",
      "- 反応がないまま追加で送る",
      "",
      "次の一手",
      needsPause
        ? "今日は追加連絡を控え、送る場合も短く、責めず、返事を求めない文面に整えるのが安全です。"
        : "次の一手は1つに絞り、相手の反応を取りにいくより関係を悪化させない行動を優先してください。",
      "",
      "倉本さんが確認すべき質問",
      "- 最後に彼から自然な反応があったのはいつか",
      "- いま送ろうとしている文面はあるか",
      "- 本当は彼に何を確認したいのか",
    ].join("\n");
  }

  if (promptName === "aftercall.md") {
    const transcript = extractTranscript(userContent);
    const hasRisk = /返金|解約|不満|意味ない|死にたい|消えたい|依存|何度も|眠れない/.test(transcript);
    return [
      "通話要約",
      `${name}さんは、相手の反応や今後の関係について不安が強く、すぐに答えを確認したい気持ちが出ていました。一方で、関係を悪化させたくない気持ちもあり、今後の動き方を整理する必要がある状態です。`,
      "",
      "顧客の感情変化",
      "通話前は不安と焦りが中心でしたが、今すぐ結果を取りにいかない方針を確認することで、少し落ち着いて次の一手を考えられる状態になりました。",
      "",
      "彼の現在地変化",
      "断定はできませんが、彼は今すぐ強い反応を返すというより、距離感や負担感で反応が変わりやすい状態として見るのが安全です。",
      "",
      "今回決めた行動",
      "追いLINEや確認要求は控え、送る場合も短く、責めず、返事を求めすぎない文面に整える。",
      "",
      "次回までの宿題",
      "彼に送る前のLINE文面を一度メモに書き出し、送る目的が「確認」ではなく「関係を整えること」になっているか確認する。",
      "",
      "次回通話で聞く質問",
      "- 通話後に不安が強くなった場面はあったか",
      "- 彼へ送ろうとした文面はあるか",
      "- 今いちばん怖い未来は何か",
      "",
      "最終30日設計書に入れる素材",
      `不安が強い時ほど、${limitText(transcript, 120) || "相手の反応を急いで確認したくなる"}傾向があるため、行動前に目的を整理するステップが必要。`,
      "",
      "リスク判定",
      hasRisk ? "注意: 不満・依存・強い不安の兆候があります。次回までの対応頻度と送信文面に注意してください。" : "低: 現時点では強い返金・依存・禁止相談リスクは目立ちません。",
      "",
      "顧客カルテへの追記文",
      "不安が強い時に確認行動へ傾きやすいため、次回は送信前の目的整理と、追いLINEを控える行動設計を確認する。",
    ].join("\n");
  }

  return "無料テンプレート生成モードで処理しました。内容を確認して必要に応じて手直ししてください。";
}
