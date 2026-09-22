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
    id: "youtube_animated_pills",
    name: "Live YouTube Animation (Like & Subscribe)",
    badge: "🔥 Live YouTube",
    lines: ["LIKE", "SUBSCRIBE"],
    accent: "#FF0000",
    lang: "en",
    title: "LIKE & SUBSCRIBE",
    sub: "Анімовані кнопки YouTube з плавною появою та пульсацією (English)",
    btnSub: "SUBSCRIBE",
    btnLike: "LIKE",
    isAnimated: true,
  },
];

export const OUTRO_PLACEMENT_MODES = [
  { id: "bottom_floating", label: "На весь ролик знизу", desc: "Плаваючий стікер YouTube у зоні безпеки (без перекриття дій)" },
  { id: "outro_card", label: "Тільки в кінці (аутро)", desc: "Поява на останніх 2.8с ролика" },
];

export const OUTRO_BG_MODES = [
  { id: "transparent", label: "Без затемнення (плаваючий стікер)", desc: "Чисті анімовані кнопки YouTube" },
  { id: "deep_black", label: "Чорний екран", desc: "Перехід у чорний фон" },
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
    desc: "Збалансований пул: 4-актні сюжетні арки, епічні сольні хайлайти та фейли."
  },
  {
    id: "story_arc",
    name: "🎬 4-актна драматургія (Story Arc)",
    badge: "3-4 сцени",
    desc: "Класична вірусна структура: Зав'язка ➡️ Ескалація ➡️ Кульмінація ➡️ Фінал з одного епізоду."
  },
  {
    id: "highlights",
    name: "🔥 Епічний сольний хайлайт",
    badge: "1 суцільний дубль",
    desc: "Концентрований адреналін: 1 суцільний відрізок (18–35с) без розривів та втрати темпу."
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
    id: "contrast",
    name: "🎭 «Контраст» (Expectation vs Reality)",
    badge: "Контраст",
    desc: "Порівняння або різка зміна темпу: як планувалось vs як вийшло."
  },
  {
    id: "chronological",
    name: "🏁 «Хронологічний міні-серіал»",
    badge: "Серіал",
    desc: "Послідовні частини: зав'язка, розвиток подій, інтрига та розв'язка."
  }
];
