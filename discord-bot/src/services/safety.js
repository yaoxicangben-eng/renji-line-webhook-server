const NG_PATTERNS = [
  { label: "復縁保証", pattern: /必ず復縁|絶対復縁|復縁できます/ },
  { label: "連絡保証", pattern: /絶対連絡|必ず連絡|連絡が来ます/ },
  { label: "愛情断定", pattern: /愛しています|好きです|本気です/ },
  { label: "相手操作", pattern: /思い通り|コントロール|操る|変えさせる/ },
];

const RISK_PATTERNS = [
  { label: "返金", score: 80, pattern: /返金|解約|キャンセル|お金を返/ },
  { label: "不満", score: 65, pattern: /意味ない|効果ない|不満|騙された|納得できない/ },
  { label: "依存", score: 60, pattern: /何度も送|何度もLINE|追いLINEしたく|止められない|眠れない|全部見て|すぐ返事/ },
  { label: "禁止相談", score: 90, pattern: /死にたい|消えたい|自傷|脅したい|復讐/ },
];

export function checkNgExpressions(text) {
  const hits = NG_PATTERNS.filter((item) => item.pattern.test(text)).map(
    (item) => item.label,
  );
  return {
    ok: hits.length === 0,
    hits,
    summary: hits.length ? `要修正: ${hits.join(" / ")}` : "問題なし",
  };
}

export function detectRisk(text) {
  const hits = RISK_PATTERNS.filter((item) => item.pattern.test(text));
  const score = hits.reduce((max, item) => Math.max(max, item.score), 0);
  return {
    hasRisk: hits.length > 0,
    labels: hits.map((item) => item.label),
    score,
    summary: hits.length ? `${hits.map((item) => item.label).join(" / ")} (${score})` : "低",
  };
}
