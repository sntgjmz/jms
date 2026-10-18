const DEFAULT_VOLUME = 0.3;
let soundEnabledState = true;
let soundVolumeState = DEFAULT_VOLUME;

const getSoundEnabled = (): boolean => {
  return soundEnabledState;
};

const getSoundVolume = (): number => {
  return soundVolumeState;
};

export const setSoundPreferences = (enabled: boolean, volume: number) => {
  soundEnabledState = enabled;
  soundVolumeState = Math.min(1, Math.max(0, Number.isNaN(volume) ? DEFAULT_VOLUME : volume));
};

const playBeep = (frequency: number, duration: number, volume: number = DEFAULT_VOLUME) => {
  try {
    if (!getSoundEnabled()) {
      return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = volume;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.log('Audio not supported:', error);
  }
};

export const playNotificationSound = (type: 'success' | 'error' | 'info' = 'info') => {
  const masterVolume = getSoundVolume();
  switch (type) {
    case 'success':
      playBeep(523.25, 0.1, Math.min(1, masterVolume * 1.0)); // C5
      setTimeout(() => playBeep(659.25, 0.15, Math.min(1, masterVolume * 1.0)), 100); // E5
      break;
      
    case 'error':
      playBeep(200, 0.15, Math.min(1, masterVolume * 1.2)); // Low warning tone
      setTimeout(() => playBeep(180, 0.15, Math.min(1, masterVolume * 1.2)), 150); // Lower warning tone
      break;
      
    default:
      playBeep(440, 0.1, Math.min(1, masterVolume * 0.8)); // A4 - soft notification
  }
};

export const playSuccessSound = () => playNotificationSound('success');
export const playErrorSound = () => playNotificationSound('error');
export const playInfoSound = () => playNotificationSound('info');
