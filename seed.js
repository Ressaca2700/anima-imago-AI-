// Script para popular o banco de dados com as 14 peças de exemplo do protótipo.
// Rode uma vez, depois de configurar as variáveis de ambiente (veja README.md):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node seed.js

const fs = require("fs");
const path = require("path");
const { insertProduct, uploadImage } = require("./api/_lib/supabase");

const SEED = [
  { file: "piece-01.jpg", price: 68, category: "abstract", title: { en: "Gilded Reverie", es: "Ensueño Dorado", zh: "金色遐想" }, desc: { en: "A slow wash of amber light, as if memory itself had a color.", es: "Un lento baño de luz ámbar, como si el recuerdo tuviera color.", zh: "缓缓流淌的琥珀光，仿佛记忆本身也有色彩。" } },
  { file: "piece-02.jpg", price: 74, category: "landscape", title: { en: "Blue Hour Drift", es: "Deriva de la Hora Azul", zh: "蓝调时刻" }, desc: { en: "An imagined coastline suspended between night and thought.", es: "Una costa imaginada suspendida entre la noche y el pensamiento.", zh: "一片虚构的海岸线，悬浮于夜晚与思绪之间。" } },
  { file: "piece-03.jpg", price: 62, category: "portrait", title: { en: "Ember Study", es: "Estudio de Brasa", zh: "余烬之study" }, desc: { en: "Warm rust tones built from thousands of imagined embers.", es: "Tonos cálidos de óxido construidos a partir de miles de brasas imaginadas.", zh: "由无数虚构余烬构成的温暖锈色。" } },
  { file: "piece-04.jpg", price: 80, category: "abstract", title: { en: "Violet Threshold", es: "Umbral Violeta", zh: "紫色门槛" }, desc: { en: "The moment before an idea becomes an image.", es: "El instante antes de que una idea se convierta en imagen.", zh: "灵感化为影像之前的瞬间。" } },
  { file: "piece-05.jpg", price: 71, category: "landscape", title: { en: "Teal Meridian", es: "Meridiano Verde Azulado", zh: "青绿子午线" }, desc: { en: "A quiet horizon drawn from cool, generative light.", es: "Un horizonte tranquilo trazado con luz generativa y fría.", zh: "由清凉的生成之光勾勒出的宁静地平线。" } },
  { file: "piece-06.jpg", price: 66, category: "portrait", title: { en: "Rose Static", es: "Estática Rosa", zh: "玫瑰静电" }, desc: { en: "Soft magenta noise, resolving into something almost human.", es: "Un suave ruido magenta que se resuelve en algo casi humano.", zh: "柔和的品红噪点，逐渐显现出近乎人形的轮廓。" } },
  { file: "piece-07.jpg", price: 76, category: "abstract", title: { en: "Amber Signal", es: "Señal Ámbar", zh: "琥珀信号" }, desc: { en: "A single warm frequency, rendered until it became a place.", es: "Una sola frecuencia cálida, renderizada hasta convertirse en un lugar.", zh: "一束温暖的频率，被不断渲染直至成为一处所在。" } },
  { file: "piece-08.jpg", price: 69, category: "landscape", title: { en: "Verdant Hush", es: "Susurro Verdeante", zh: "翠绿低语" }, desc: { en: "A forest that exists only in the space between prompts.", es: "Un bosque que solo existe en el espacio entre las instrucciones.", zh: "一片只存在于提示词之间的森林。" } },
  { file: "piece-09.jpg", price: 84, category: "abstract", title: { en: "Champagne Fold", es: "Pliegue Champán", zh: "香槟褶皱" }, desc: { en: "Light folded over itself, again and again, until it was one.", es: "Luz plegada sobre sí misma, una y otra vez, hasta ser una sola.", zh: "光一次次自我折叠，终成一体。" } },
  { file: "piece-10.jpg", price: 72, category: "portrait", title: { en: "Cyan Noir", es: "Cian Noir", zh: "青色暗调" }, desc: { en: "A face imagined in the coldest, clearest part of the mind.", es: "Un rostro imaginado en la parte más fría y clara de la mente.", zh: "在心灵最清冷之处想象出的面容。" } },
  { file: "piece-11.jpg", price: 78, category: "abstract", title: { en: "Orchid Recall", es: "Recuerdo de Orquídea", zh: "兰花记忆" }, desc: { en: "A memory that was never real, purple and unrepeatable.", es: "Un recuerdo que nunca fue real, violeta e irrepetible.", zh: "一段从未真实存在、紫色且不可复制的记忆。" } },
  { file: "piece-12.jpg", price: 65, category: "landscape", title: { en: "Terracotta Field", es: "Campo de Terracota", zh: "赤陶原野" }, desc: { en: "Sun-warmed ground that was never touched by a sun at all.", es: "Tierra calentada por el sol que nunca fue tocada por sol alguno.", zh: "被阳光温暖却从未被真正阳光照耀的土地。" } },
  { file: "piece-13.jpg", price: 73, category: "nature", title: { en: "Crimson Bloom", es: "Flor Carmesí", zh: "绯红花开" }, desc: { en: "A blossom that opened only once, imagined in deep rose.", es: "Una flor que se abrió una sola vez, imaginada en rosa profundo.", zh: "一朵只绽放过一次的花，以深玫瑰色被想象出来。" } },
  { file: "piece-14.jpg", price: 70, category: "stilllife", title: { en: "Quiet Table", es: "Mesa Silenciosa", zh: "静谧之桌" }, desc: { en: "Objects that never sat together, arranged by a mind at rest.", es: "Objetos que nunca estuvieron juntos, dispuestos por una mente en calma.", zh: "从未真实并置的物件，由一颗静止的心灵所摆放。" } },
];

async function main() {
  for (const item of SEED) {
    const filePath = path.join(__dirname, "public", "assets", "gallery", item.file);
    const buffer = fs.readFileSync(filePath);
    const storagePath = `seed-${item.file}`;
    await uploadImage(storagePath, buffer, "image/jpeg");
    await insertProduct({
      title_en: item.title.en, title_es: item.title.es, title_zh: item.title.zh,
      desc_en: item.desc.en, desc_es: item.desc.es, desc_zh: item.desc.zh,
      price: item.price, category: item.category, image_path: storagePath, sold: false,
    });
    console.log(`✓ ${item.title.en}`);
  }
  console.log("Pronto! 14 peças de exemplo publicadas.");
}

main().catch((err) => { console.error(err); process.exit(1); });
