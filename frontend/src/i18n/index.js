import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const LANGUAGES = [
  { code: "en",    name: "English",   native: "English",    dir: "ltr" },
  { code: "es",    name: "Spanish",   native: "Español",    dir: "ltr" },
  { code: "fr",    name: "French",    native: "Français",   dir: "ltr" },
  { code: "de",    name: "German",    native: "Deutsch",    dir: "ltr" },
  { code: "pt",    name: "Portuguese",native: "Português",  dir: "ltr" },
  { code: "it",    name: "Italian",   native: "Italiano",   dir: "ltr" },
  { code: "nl",    name: "Dutch",     native: "Nederlands", dir: "ltr" },
  { code: "ja",    name: "Japanese",  native: "日本語",       dir: "ltr" },
  { code: "zh-CN", name: "Chinese",   native: "简体中文",     dir: "ltr" },
  { code: "ko",    name: "Korean",    native: "한국어",       dir: "ltr" },
  { code: "ar",    name: "Arabic",    native: "العربية",    dir: "rtl" },
  { code: "hi",    name: "Hindi",     native: "हिन्दी",      dir: "ltr" },
];

const resources = {
  en: { translation: {
    nav: { marketplace: "Home", search: "Search", community: "Community", print: "Send To Print", dashboard: "Dashboard", wishlist: "Wishlist", designs: "My Designs", orders: "My Orders", signin: "Sign in", signout: "Sign out" },
    hero: { eyebrow: "3D · PRINT · MARKETPLACE", title1: "Forge your next", title2: "three-dimensional", title3: "obsession.", desc: "Discover print-ready designs, search every major model site in one place, and send us any file to have it printed and shipped. A workbench for the maker era.", cta_search: "Search 3D models", cta_send: "Send a file to print" },
    market: { title: "Curated Marketplace", desc: "Hand-picked designs ready to order — every model tested and printed in our lab.", search_ph: "Search catalog…" },
    product: { back: "Back to marketplace", request_print: "Request a print" },
    wishlist: { save: "Save", saved: "Saved", added: "Added to wishlist", removed: "Removed from wishlist", signin_required: "Sign in to save to wishlist" },
    chat: { title: "Chat with the maker", placeholder: "Type your message…", send: "Send", empty: "Send a message and we'll reply. Messages are auto-translated in both directions.", you: "You", owner: "Maker", translated_from: "translated from", show_original: "show original", show_translation: "show translation", signin_required: "Sign in to start a chat", langbar: "Chat language" },
    lang: { label: "Language" },
  }},
  es: { translation: {
    nav: { marketplace: "Inicio", search: "Buscar", community: "Comunidad", print: "Enviar a imprimir", dashboard: "Panel", wishlist: "Favoritos", designs: "Mis diseños", orders: "Mis pedidos", signin: "Entrar", signout: "Salir" },
    hero: { eyebrow: "3D · IMPRESIÓN · MERCADO", title1: "Forja tu próxima", title2: "obsesión", title3: "tridimensional.", desc: "Descubre diseños listos para imprimir, busca en todos los sitios en un solo lugar y envíanos cualquier archivo para que lo imprimamos y enviemos.", cta_search: "Buscar modelos 3D", cta_send: "Enviar archivo" },
    market: { title: "Mercado curado", desc: "Diseños seleccionados listos para pedir — cada modelo probado en nuestro laboratorio.", search_ph: "Buscar catálogo…" },
    product: { back: "Volver al mercado", request_print: "Solicitar impresión" },
    wishlist: { save: "Guardar", saved: "Guardado", added: "Añadido a favoritos", removed: "Eliminado de favoritos", signin_required: "Inicia sesión para guardar" },
    chat: { title: "Chatea con el fabricante", placeholder: "Escribe tu mensaje…", send: "Enviar", empty: "Envía un mensaje y responderemos. Se traducen automáticamente.", you: "Tú", owner: "Fabricante", translated_from: "traducido de", show_original: "ver original", show_translation: "ver traducción", signin_required: "Inicia sesión para chatear", langbar: "Idioma del chat" },
    lang: { label: "Idioma" },
  }},
  fr: { translation: {
    nav: { marketplace: "Accueil", search: "Rechercher", community: "Communauté", print: "Envoyer à imprimer", dashboard: "Tableau", wishlist: "Favoris", designs: "Mes designs", orders: "Mes commandes", signin: "Se connecter", signout: "Déconnexion" },
    hero: { eyebrow: "3D · IMPRESSION · MARCHÉ", title1: "Forgez votre prochaine", title2: "obsession", title3: "tridimensionnelle.", desc: "Découvrez des designs prêts à imprimer, cherchez sur tous les sites au même endroit, et envoyez-nous n'importe quel fichier.", cta_search: "Rechercher des modèles 3D", cta_send: "Envoyer un fichier" },
    market: { title: "Marché sélectionné", desc: "Designs choisis à la main — chaque modèle testé dans notre labo.", search_ph: "Rechercher…" },
    product: { back: "Retour au marché", request_print: "Demander une impression" },
    wishlist: { save: "Sauver", saved: "Sauvegardé", added: "Ajouté aux favoris", removed: "Retiré des favoris", signin_required: "Connectez-vous pour sauvegarder" },
    chat: { title: "Discuter avec l'artisan", placeholder: "Tapez votre message…", send: "Envoyer", empty: "Envoyez un message, nous répondrons. Traduction automatique dans les deux sens.", you: "Vous", owner: "Artisan", translated_from: "traduit de", show_original: "voir l'original", show_translation: "voir la traduction", signin_required: "Connectez-vous pour discuter", langbar: "Langue du chat" },
    lang: { label: "Langue" },
  }},
  de: { translation: {
    nav: { marketplace: "Startseite", search: "Suchen", community: "Community", print: "Zum Drucken senden", dashboard: "Dashboard", wishlist: "Wunschliste", designs: "Meine Designs", orders: "Meine Bestellungen", signin: "Anmelden", signout: "Abmelden" },
    hero: { eyebrow: "3D · DRUCK · MARKTPLATZ", title1: "Schmiede deine nächste", title2: "dreidimensionale", title3: "Obsession.", desc: "Entdecke druckfertige Designs, durchsuche jede große Modell-Seite an einem Ort und sende uns beliebige Dateien zum Druck.", cta_search: "3D-Modelle suchen", cta_send: "Datei senden" },
    market: { title: "Kuratierter Marktplatz", desc: "Handverlesene Designs — jedes Modell im Labor getestet.", search_ph: "Katalog durchsuchen…" },
    product: { back: "Zurück zum Marktplatz", request_print: "Druck anfordern" },
    wishlist: { save: "Speichern", saved: "Gespeichert", added: "Zur Wunschliste hinzugefügt", removed: "Von Wunschliste entfernt", signin_required: "Zum Speichern anmelden" },
    chat: { title: "Chatte mit dem Maker", placeholder: "Nachricht eingeben…", send: "Senden", empty: "Sende eine Nachricht — Antworten werden automatisch übersetzt.", you: "Du", owner: "Maker", translated_from: "übersetzt aus", show_original: "Original", show_translation: "Übersetzung", signin_required: "Anmelden zum Chatten", langbar: "Chat-Sprache" },
    lang: { label: "Sprache" },
  }},
  pt: { translation: {
    nav: { marketplace: "Inicio", search: "Buscar", community: "Comunidade", print: "Enviar para imprimir", dashboard: "Painel", wishlist: "Favoritos", designs: "Meus designs", orders: "Meus pedidos", signin: "Entrar", signout: "Sair" },
    hero: { eyebrow: "3D · IMPRESSÃO · MERCADO", title1: "Forje sua próxima", title2: "obsessão", title3: "tridimensional.", desc: "Descubra designs prontos para imprimir, pesquise em todos os sites num só lugar e envie qualquer arquivo para imprimirmos.", cta_search: "Buscar modelos 3D", cta_send: "Enviar arquivo" },
    market: { title: "Mercado Curado", desc: "Designs selecionados — cada modelo testado no laboratório.", search_ph: "Buscar catálogo…" },
    product: { back: "Voltar ao mercado", request_print: "Pedir impressão" },
    wishlist: { save: "Salvar", saved: "Salvo", added: "Adicionado aos favoritos", removed: "Removido dos favoritos", signin_required: "Entre para salvar" },
    chat: { title: "Converse com o maker", placeholder: "Digite sua mensagem…", send: "Enviar", empty: "Envie uma mensagem — traduções automáticas.", you: "Você", owner: "Maker", translated_from: "traduzido de", show_original: "ver original", show_translation: "ver tradução", signin_required: "Entre para conversar", langbar: "Idioma do chat" },
    lang: { label: "Idioma" },
  }},
  it: { translation: {
    nav: { marketplace: "Home", search: "Cerca", community: "Community", print: "Invia in stampa", dashboard: "Dashboard", wishlist: "Preferiti", designs: "I miei design", orders: "I miei ordini", signin: "Accedi", signout: "Esci" },
    hero: { eyebrow: "3D · STAMPA · MERCATO", title1: "Forgia la tua prossima", title2: "ossessione", title3: "tridimensionale.", desc: "Scopri design pronti da stampare, cerca in tutti i siti in un unico posto, inviaci qualsiasi file.", cta_search: "Cerca modelli 3D", cta_send: "Invia file" },
    market: { title: "Mercato Curato", desc: "Design selezionati — ogni modello testato in laboratorio.", search_ph: "Cerca…" },
    product: { back: "Torna al mercato", request_print: "Richiedi stampa" },
    wishlist: { save: "Salva", saved: "Salvato", added: "Aggiunto ai preferiti", removed: "Rimosso", signin_required: "Accedi per salvare" },
    chat: { title: "Chatta col maker", placeholder: "Scrivi il tuo messaggio…", send: "Invia", empty: "Invia un messaggio — traduzione automatica.", you: "Tu", owner: "Maker", translated_from: "tradotto da", show_original: "originale", show_translation: "traduzione", signin_required: "Accedi per chattare", langbar: "Lingua chat" },
    lang: { label: "Lingua" },
  }},
  nl: { translation: {
    nav: { marketplace: "Home", search: "Zoeken", community: "Community", print: "Print sturen", dashboard: "Dashboard", wishlist: "Verlanglijst", designs: "Mijn ontwerpen", orders: "Mijn bestellingen", signin: "Inloggen", signout: "Uitloggen" },
    hero: { eyebrow: "3D · PRINT · MARKTPLAATS", title1: "Smeed je volgende", title2: "driedimensionale", title3: "obsessie.", desc: "Ontdek printklare ontwerpen en stuur ons elk bestand om te printen.", cta_search: "3D-modellen zoeken", cta_send: "Bestand sturen" },
    market: { title: "Curated Marketplace", desc: "Handgekozen ontwerpen — elk model in ons lab getest.", search_ph: "Catalogus zoeken…" },
    product: { back: "Terug", request_print: "Print aanvragen" },
    wishlist: { save: "Bewaar", saved: "Bewaard", added: "Toegevoegd", removed: "Verwijderd", signin_required: "Log in om te bewaren" },
    chat: { title: "Chat met de maker", placeholder: "Typ je bericht…", send: "Verstuur", empty: "Stuur een bericht — automatisch vertaald.", you: "Jij", owner: "Maker", translated_from: "vertaald uit", show_original: "origineel", show_translation: "vertaling", signin_required: "Log in om te chatten", langbar: "Chattaal" },
    lang: { label: "Taal" },
  }},
  ja: { translation: {
    nav: { marketplace: "ホーム", search: "検索", community: "コミュニティ", print: "印刷を依頼", dashboard: "ダッシュボード", wishlist: "ウィッシュリスト", designs: "自分のデザイン", orders: "注文", signin: "サインイン", signout: "サインアウト" },
    hero: { eyebrow: "3D · プリント · マーケット", title1: "次なる", title2: "立体の", title3: "情熱を鍛える。", desc: "印刷可能なデザインを発見し、あらゆる主要サイトを一括検索。ファイルを送るだけで印刷・発送します。", cta_search: "3Dモデル検索", cta_send: "ファイルを送る" },
    market: { title: "厳選マーケット", desc: "厳選されたデザイン — 全モデルをラボでテスト済み。", search_ph: "カタログ検索…" },
    product: { back: "マーケットへ戻る", request_print: "印刷を依頼" },
    wishlist: { save: "保存", saved: "保存済", added: "ウィッシュリストに追加", removed: "削除しました", signin_required: "保存にはサインインが必要です" },
    chat: { title: "メーカーとチャット", placeholder: "メッセージを入力…", send: "送信", empty: "メッセージを送るとお返事します。自動翻訳されます。", you: "あなた", owner: "メーカー", translated_from: "元の言語", show_original: "原文を見る", show_translation: "翻訳を見る", signin_required: "チャットにはサインイン", langbar: "チャット言語" },
    lang: { label: "言語" },
  }},
  "zh-CN": { translation: {
    nav: { marketplace: "首页", search: "搜索", community: "社区", print: "发送打印", dashboard: "仪表盘", wishlist: "心愿单", designs: "我的设计", orders: "我的订单", signin: "登录", signout: "退出" },
    hero: { eyebrow: "3D · 打印 · 商城", title1: "锻造你的下一个", title2: "三维", title3: "痴迷。", desc: "发现可打印设计,一站式搜索所有 3D 模型网站,任何文件都可寄给我们打印发货。", cta_search: "搜索 3D 模型", cta_send: "发送文件" },
    market: { title: "精选商城", desc: "精心挑选的设计 — 每个模型都在我们实验室测试。", search_ph: "搜索目录…" },
    product: { back: "返回商城", request_print: "申请打印" },
    wishlist: { save: "收藏", saved: "已收藏", added: "已加入心愿单", removed: "已移除", signin_required: "请先登录" },
    chat: { title: "与打印师聊天", placeholder: "输入消息…", send: "发送", empty: "发条消息我们会回复,自动双向翻译。", you: "您", owner: "打印师", translated_from: "译自", show_original: "查看原文", show_translation: "查看译文", signin_required: "请先登录聊天", langbar: "聊天语言" },
    lang: { label: "语言" },
  }},
  ko: { translation: {
    nav: { marketplace: "홈", search: "검색", community: "커뮤니티", print: "인쇄 요청", dashboard: "대시보드", wishlist: "위시리스트", designs: "내 디자인", orders: "내 주문", signin: "로그인", signout: "로그아웃" },
    hero: { eyebrow: "3D · 프린트 · 마켓", title1: "다음", title2: "삼차원", title3: "집착을 만들어라.", desc: "인쇄 준비 완료 디자인 발견, 모든 사이트 통합 검색, 파일 전송 시 인쇄 후 배송.", cta_search: "3D 모델 검색", cta_send: "파일 보내기" },
    market: { title: "큐레이티드 마켓", desc: "직접 고른 디자인 — 모든 모델 랩 테스트.", search_ph: "카탈로그 검색…" },
    product: { back: "마켓으로", request_print: "인쇄 요청" },
    wishlist: { save: "저장", saved: "저장됨", added: "위시리스트 추가", removed: "삭제됨", signin_required: "로그인 필요" },
    chat: { title: "메이커와 대화", placeholder: "메시지 입력…", send: "전송", empty: "메시지 보내면 답장 드려요. 자동 번역됩니다.", you: "나", owner: "메이커", translated_from: "번역", show_original: "원문 보기", show_translation: "번역 보기", signin_required: "로그인 필요", langbar: "채팅 언어" },
    lang: { label: "언어" },
  }},
  ar: { translation: {
    nav: { marketplace: "الرئيسية", search: "بحث", community: "المجتمع", print: "إرسال للطباعة", dashboard: "لوحة التحكم", wishlist: "المفضلة", designs: "تصميماتي", orders: "طلباتي", signin: "دخول", signout: "خروج" },
    hero: { eyebrow: "3D · طباعة · متجر", title1: "اصنع هوسك", title2: "ثلاثي الأبعاد", title3: "التالي.", desc: "اكتشف تصميمات جاهزة للطباعة، وابحث عبر جميع مواقع النماذج في مكان واحد، وأرسل أي ملف لنطبعه ونشحنه.", cta_search: "ابحث عن نماذج", cta_send: "أرسل ملفاً" },
    market: { title: "متجر منسق", desc: "تصميمات مختارة يدوياً — كل نموذج مُختبَر في مختبرنا.", search_ph: "ابحث في الكتالوج…" },
    product: { back: "عودة للمتجر", request_print: "اطلب طباعة" },
    wishlist: { save: "حفظ", saved: "محفوظ", added: "أضيف للمفضلة", removed: "أُزيل", signin_required: "سجّل الدخول للحفظ" },
    chat: { title: "دردش مع الصانع", placeholder: "اكتب رسالتك…", send: "أرسل", empty: "أرسل رسالة وسنرد. الترجمة تلقائية.", you: "أنت", owner: "الصانع", translated_from: "مترجم من", show_original: "الأصل", show_translation: "الترجمة", signin_required: "سجّل الدخول للدردشة", langbar: "لغة الدردشة" },
    lang: { label: "اللغة" },
  }},
  hi: { translation: {
    nav: { marketplace: "होम", search: "खोज", community: "समुदाय", print: "प्रिंट भेजें", dashboard: "डैशबोर्ड", wishlist: "पसंदीदा", designs: "मेरे डिज़ाइन", orders: "मेरे ऑर्डर", signin: "साइन इन", signout: "साइन आउट" },
    hero: { eyebrow: "3D · प्रिंट · बाज़ार", title1: "अपना अगला", title2: "त्रि-आयामी", title3: "जुनून गढ़ें।", desc: "प्रिंट-रेडी डिज़ाइन खोजें, हर बड़ी मॉडल साइट को एक जगह खोजें, कोई भी फ़ाइल भेजें — हम प्रिंट कर के भेजेंगे।", cta_search: "3D मॉडल खोजें", cta_send: "फ़ाइल भेजें" },
    market: { title: "क्यूरेटेड बाज़ार", desc: "हस्त-चयनित डिज़ाइन — हर मॉडल हमारी लैब में परखा गया।", search_ph: "कैटलॉग खोजें…" },
    product: { back: "बाज़ार पर वापस", request_print: "प्रिंट का अनुरोध करें" },
    wishlist: { save: "सहेजें", saved: "सहेजा गया", added: "पसंदीदा में जोड़ा", removed: "हटाया गया", signin_required: "सहेजने के लिए साइन इन करें" },
    chat: { title: "मेकर से चैट करें", placeholder: "अपना संदेश टाइप करें…", send: "भेजें", empty: "संदेश भेजें, हम जवाब देंगे। स्वतः अनुवाद।", you: "आप", owner: "मेकर", translated_from: "अनुवाद", show_original: "मूल दिखाएँ", show_translation: "अनुवाद दिखाएँ", signin_required: "चैट के लिए साइन इन करें", langbar: "चैट भाषा" },
    lang: { label: "भाषा" },
  }},
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map(l => l.code),
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
  });

// Sync HTML dir attribute for RTL languages
const applyDir = (lng) => {
  const meta = LANGUAGES.find(l => l.code === lng);
  if (meta) document.documentElement.setAttribute("dir", meta.dir);
  document.documentElement.setAttribute("lang", lng);
};
applyDir(i18n.language);
i18n.on("languageChanged", applyDir);

export default i18n;
