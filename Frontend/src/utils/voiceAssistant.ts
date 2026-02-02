let isVoiceEnabled = true;

export const speak = (text: string) => {
  if (!isVoiceEnabled || !('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;      // smoother
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = 'en-IN';

  window.speechSynthesis.speak(utterance);
};

export const stopVoice = () => {
  window.speechSynthesis.cancel();
};

export const toggleVoice = (value: boolean) => {
  isVoiceEnabled = value;
  if (!value) stopVoice();
};
