let currentUtterance: SpeechSynthesisUtterance | null = null;

const detectLang = (text: string) => {
  return /[\u0B80-\u0BFF]/.test(text) ? 'ta-IN' : 'en-IN';
};

const getVoice = (lang: string) => {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang === lang) ||
    voices.find(v => v.lang.startsWith(lang.split('-')[0])) ||
    voices[0]
  );
};

export const speakNav = (text: string) => {
  if (!('speechSynthesis' in window)) return;

  const lang = detectLang(text);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.voice = getVoice(lang);
  utterance.rate = 0.95;
  utterance.pitch = 1;

  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
};

export const stopNavVoice = () => {
  speechSynthesis.cancel();
};
