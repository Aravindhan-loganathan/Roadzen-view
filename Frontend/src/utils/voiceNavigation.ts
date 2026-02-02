import { speak } from './voiceAssistant';

export const startVoiceNavigation = (steps: any[]) => {
  speak('Navigation started');

  steps.forEach((step, index) => {
    const distance = Math.round(step.distance);
    const road = step.name || 'the road';
    const type = step.maneuver.type;
    const modifier = step.maneuver.modifier;

    let message = '';

    switch (type) {
      case 'depart':
        message = `Start and head on ${road}`;
        break;
      case 'turn':
        message = `In ${distance} meters, turn ${modifier} onto ${road}`;
        break;
      case 'continue':
        message = `Continue straight for ${distance} meters`;
        break;
      case 'arrive':
        message = 'You have arrived at your destination';
        break;
      default:
        message = `Proceed on ${road}`;
    }

    setTimeout(() => speak(message), index * 4000);
  });
};
