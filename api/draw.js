import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function getZodiac(month, day) {
  const signs = [
    ["capricorn", "염소자리", [1, 19]],
    ["aquarius", "물병자리", [2, 18]],
    ["pisces", "물고기자리", [3, 20]],
    ["aries", "양자리", [4, 19]],
    ["taurus", "황소자리", [5, 20]],
    ["gemini", "쌍둥이자리", [6, 20]],
    ["cancer", "게자리", [7, 22]],
    ["leo", "사자자리", [8, 22]],
    ["virgo", "처녀자리", [9, 22]],
    ["libra", "천칭자리", [10, 22]],
    ["scorpio", "전갈자리", [11, 21]],
    ["sagittarius", "사수자리", [12, 21]],
    ["capricorn", "염소자리", [12, 31]],
  ];

  for (const [key, label, [endMonth, endDay]] of signs) {
    if (month < endMonth || (month === endMonth && day <= endDay)) {
      return { key, label };
    }
  }

  return { key: "capricorn", label: "염소자리" };
}

function getZodiacTraits(zodiacKey) {
  const traits = {
    aries: "시작, 추진력, 빠른 결단",
    taurus: "안정, 감각, 꾸준함",
    gemini: "호기심, 변화, 조합",
    cancer: "보호, 직관, 정서",
    leo: "자신감, 중심성, 강한 존재감",
    virgo: "정리, 균형, 세밀함",
    libra: "조화, 균형감, 미적 감각",
    scorpio: "집중, 깊이, 강한 직감",
    sagittarius: "확장, 자유, 낙관",
    capricorn: "책임, 구조, 목표지향",
    aquarius: "독창성, 미래감, 실험정신",
    pisces: "상상력, 공감, 유연함",
  };
  return traits[zodiacKey] || "균형";
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawLottoNumbers(seedText) {
  const rand = createRandom(hashString(seedText));
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const picks = [];
  while (picks.length < 6) {
    const index = Math.floor(rand() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  picks.sort((a, b) => a - b);
  const bonus = pool[Math.floor(rand() * pool.length)];
  return { picks, bonus };
}

function localExplanation({ birthdate, zodiacLabel, zodiacKey, numbers, bonus }) {
  const traits = getZodiacTraits(zodiacKey);
  return [
    `생년월일 ${birthdate}은 ${zodiacLabel}의 흐름으로 읽었어요.`,
    `이 별자리는 ${traits} 같은 키워드가 강해서, 번호도 치우치지 않게 앞/가운데/뒤 구간을 섞어 골랐어요.`,
    `${numbers[0]}은 초반 구간의 시작 에너지를, ${numbers[2]}은 중심을 잡는 안정감을, ${numbers[numbers.length - 1]}은 마무리 운을 상징하는 번호로 배치했어요.`,
    `보너스 ${bonus}는 본 번호와 겹치지 않는 또 다른 흐름을 더해주기 위해 선택했어요.`,
    `즉, 이 조합은 "${zodiacLabel}의 성향 + 날짜 시드 + 구간 균형"을 함께 반영한 결과예요.`,
  ].join(" ");
}

async function saveDraw(draw) {
  if (!supabase) return;

  const { error } = await supabase.from("lotto_draws").insert({
    birthdate: draw.birthdate,
    zodiac: draw.zodiac,
    zodiac_key: draw.zodiacKey,
    zodiac_traits: draw.zodiacTraits,
    numbers: draw.numbers,
    bonus: draw.bonus,
    explanation: draw.explanation,
  });

  if (error) {
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const { birthdate } = req.body || {};
    if (!birthdate) return sendJson(res, 400, { error: "birthdate is required" });

    const parsed = new Date(`${birthdate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return sendJson(res, 400, { error: "invalid birthdate" });
    }

    const month = parsed.getMonth() + 1;
    const day = parsed.getDate();
    const zodiac = getZodiac(month, day);
    const { picks, bonus } = drawLottoNumbers(`${birthdate}:${zodiac.key}`);

    let explanation = localExplanation({
      birthdate,
      zodiacLabel: zodiac.label,
      zodiacKey: zodiac.key,
      numbers: picks,
      bonus,
    });

    if (openai) {
      try {
        const prompt = [
          "당신은 한국어 로또 추첨 설명 챗봇입니다.",
          "사용자가 입력한 생년월일과 별자리를 바탕으로 추첨된 번호의 의미를 짧고 친절하게 설명하세요.",
          "규칙:",
          "1. 실제 점술처럼 단정하지 말고 재미 요소로 표현하세요.",
          "2. 번호마다 이유를 1문장씩 설명하세요.",
          "3. 전체 설명은 5~8문장으로 간결하게 쓰세요.",
          "4. 출력에는 제목, 번호 목록, 짧은 마무리만 포함하세요.",
          "",
          `생년월일: ${birthdate}`,
          `별자리: ${zodiac.label}`,
          `별자리 키: ${zodiac.key}`,
          `추첨 번호: ${picks.join(", ")}`,
          `보너스 번호: ${bonus}`,
        ].join("\n");

        const response = await openai.responses.create({
          model: MODEL,
          input: prompt,
          temperature: 0.7,
        });

        explanation = response.output_text?.trim() || explanation;
      } catch {
        // Keep local explanation.
      }
    }

    await saveDraw({
      birthdate,
      zodiac: zodiac.label,
      zodiacKey: zodiac.key,
      zodiacTraits: getZodiacTraits(zodiac.key),
      numbers: picks,
      bonus,
      explanation,
    });

    return sendJson(res, 200, {
      birthdate,
      zodiac: zodiac.label,
      zodiacKey: zodiac.key,
      zodiacTraits: getZodiacTraits(zodiac.key),
      numbers: picks,
      bonus,
      explanation,
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "unexpected error" });
  }
}
