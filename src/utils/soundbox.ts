/**
 * Google Pay Soundbox Audio & Voice Synthesizer
 * Plays the signature 4-tone Google Pay chime and Gujarati/Hindi/English speech announcement
 */

export function playGooglePaySoundbox(amount: number | string): Promise<void> {
  return new Promise((resolve) => {
    const amtNum = typeof amount === 'number' ? amount : parseFloat(amount);
    const amtStr = !isNaN(amtNum) && amtNum > 0 ? amtNum.toFixed(0) : '0';

    try {
      // 1. Play Google Pay signature 4-tone chime chord using Web Audio API
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
        });
      }
    } catch {
      // Web Audio fallback
    }

    // 2. Play Gujarati speech announcement
    setTimeout(() => {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const voices = window.speechSynthesis.getVoices();
          const guVoice = voices.find((v) => v.lang.startsWith('gu'));
          const hiVoice = voices.find((v) => v.lang.startsWith('hi'));
          const enInVoice = voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('en'));

          const text = guVoice
            ? `Google Pay પર ${amtStr} રૂપિયા મળ્યા!`
            : hiVoice
            ? `Google Pay पर ${amtStr} रुपये प्राप्त हुए!`
            : `Received ${amtStr} rupees on Google Pay!`;

          const utterance = new SpeechSynthesisUtterance(text);
          if (guVoice) {
            utterance.voice = guVoice;
            utterance.lang = 'gu-IN';
          } else if (hiVoice) {
            utterance.voice = hiVoice;
            utterance.lang = 'hi-IN';
          } else if (enInVoice) {
            utterance.voice = enInVoice;
          }
          utterance.rate = 1.0;
          utterance.pitch = 1.05;

          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();

          window.speechSynthesis.speak(utterance);
        } else {
          resolve();
        }
      } catch {
        resolve();
      }
    }, 450);
  });
}
