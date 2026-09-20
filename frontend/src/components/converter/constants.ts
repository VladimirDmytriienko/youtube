import { OutroStyleDef } from "@/types";

export const VOICE_OPTIONS = [
  { id: "en-US-GuyNeural", name: "🔥 Guy (Hype Commentary / Gaming)", lang: "en" },
  { id: "en-US-ChristopherNeural", name: "🎬 Christopher (Deep Movie Trailer)", lang: "en" },
  { id: "en-GB-RyanNeural", name: "🏎️ Ryan (British Top Gear Drive)", lang: "en" },
  { id: "en-US-EricNeural", name: "⚡ Eric (Viral Streamer Vibe)", lang: "en" },
  { id: "en-US-SteffanNeural", name: "💥 Steffan (Intense Action)", lang: "en" },
  { id: "uk-UA-OstapNeural", name: "🇺🇦 Остап (Український живий голос)", lang: "uk" },
  { id: "uk-UA-PolinaNeural", name: "🇺🇦 Поліна (Український жіночий голос)", lang: "uk" },
];

export const OUTRO_STYLES: OutroStyleDef[] = [
  {
    id: "youtube_classic",
    name: "Червона Печать (LIKE & SUBSCRIBE)",
    badge: "🔴 YouTube Red",
    lines: ["LIKE", "SUBSCRIBE"],
    accent: "#FF2323",
    lang: "en",
    title: "LIKE & SUBSCRIBE",
    sub: "Double-border minimal stamp",
    btnSub: "SUBSCRIBE",
    btnLike: "LIKE",
  },
  {
    id: "ukrainian_native",
    name: "Золота Печать (ЛАЙК & ПІДПИСКА)",
    badge: "🇺🇦 UA Gold",
    lines: ["ЛАЙК", "ПІДПИСКА"],
    accent: "#FFD700",
    lang: "uk",
    title: "ЛАЙК ТА ПІДПИСКА",
    sub: "Нативна українська печать",
    btnSub: "ПІДПИСКА",
    btnLike: "ЛАЙК",
  },
  {
    id: "ukrainian_red",
    name: "Червона Печать (ЛАЙК & ПІДПИСКА)",
    badge: "🇺🇦 UA Red",
    lines: ["ЛАЙК", "ПІДПИСКА"],
    accent: "#FF2323",
    lang: "uk",
    title: "ЛАЙК ТА ПІДПИСКА",
    sub: "Червона українська печать",
    btnSub: "ПІДПИСКА",
    btnLike: "ЛАЙК",
  },
  {
    id: "minimal_dark",
    name: "Біла Печать (LIKE & SUBSCRIBE)",
    badge: "⚪ Pure White",
    lines: ["LIKE", "SUBSCRIBE"],
    accent: "#FFFFFF",
    lang: "en",
    title: "LIKE & SUBSCRIBE",
    sub: "Чистий білий мінімалізм",
    btnSub: "SUBSCRIBE",
    btnLike: "LIKE",
  },
  {
    id: "minimal_dark_ua",
    name: "Біла Печать (ЛАЙК & ПІДПИСКА)",
    badge: "🇺🇦 Білий Монохром",
    lines: ["ЛАЙК", "ПІДПИСКА"],
    accent: "#FFFFFF",
    lang: "uk",
    title: "ЛАЙК ТА ПІДПИСКА",
    sub: "Білий український монохром",
    btnSub: "ПІДПИСКА",
    btnLike: "ЛАЙК",
  },
  {
    id: "hype_gaming",
    name: "Неоновий Stamp (Neon Cyan)",
    badge: "⚡ Neon Cyan",
    lines: ["LIKE", "SUBSCRIBE"],
    accent: "#00F0FF",
    lang: "en",
    title: "LIKE & SUBSCRIBE",
    sub: "Електричний неоновий штамп",
    btnSub: "SUBSCRIBE",
    btnLike: "LIKE",
  },
];

export const OUTRO_BG_MODES = [
  { id: "deep_black", label: "Чорний екран (100%)", desc: "Плавний перехід у чорний фон" },
  { id: "cinematic_dark", label: "Кіно-затемнення (78%)", desc: "М'яке затемнення геймплею" },
];

export interface DirectorPreset {
  id: string;
  name: string;
  badge: string;
  desc: string;
}

export const DIRECTOR_PRESETS: DirectorPreset[] = [
  {
    id: "diverse_mix",
    name: "💥 Різноплановий мікс",
    badge: "Універсальний",
    desc: "Збалансований коктейль: епічний хайлайт, фейл, чистий скіл та кульмінація."
  },
  {
    id: "skills",
    name: "⚡ «Пік майстерності» (Pure Skill)",
    badge: "Чистий скіл",
    desc: "Ідеальне виконання, філігранні комбо, найвищий темп та реакція."
  },
  {
    id: "fails",
    name: "😂 «Курйози та хаос» (Epic Fails)",
    badge: "Гумор / Фейли",
    desc: "Смішні моменти, несподівані помилки, аварії та безглузді ситуації."
  },
  {
    id: "story_arc",
    name: "🏆 «Сюжетний камбек» (Zero to Hero)",
    badge: "Драматургія",
    desc: "Сюжетна арка: провал або труднощі на старті ➡️ запекла боротьба ➡️ тріумфальний фінал."
  },
  {
    id: "contrast",
    name: "🎭 «Контраст» (Expectation vs Reality)",
    badge: "Контраст",
    desc: "Порівняння або різка зміна темпу: як планувалось vs як вийшло."
  },
  {
    id: "highlights",
    name: "🔥 «Топ найвибуховіших сцен»",
    badge: "Хайлайти",
    desc: "Концентрований адреналін, 3–5 найпотужніших моментів ролика."
  },
  {
    id: "chronological",
    name: "🏁 «Хронологічний міні-серіал»",
    badge: "Серіал",
    desc: "Послідовні частини: зав'язка, розвиток подій, інтрига та розв'язка."
  }
];
