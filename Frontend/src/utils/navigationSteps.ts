import { speakNav } from './navigationVoice';

export const startFullNavigation = (steps: any[]) => {
  speakNav('Navigation started');

  let delay = 0;

  steps.forEach(step => {
    const distance = Math.round(step.distance);
    const road = step.name || 'the road';
    const type = step.maneuver.type;
    const modifier = step.maneuver.modifier;

    let sentence = '';

    switch (type) {
      case 'depart':
        sentence = `Start and head on ${road}`;
        break;
      case 'turn':
        sentence = `In ${distance} meters, turn ${modifier} onto ${road}`;
        break;
      case 'continue':
        sentence = `Continue straight for ${distance} meters`;
        break;
      case 'roundabout':
        sentence = `Enter the roundabout`;
        break;
      case 'arrive':
        sentence = `You have arrived at your destination`;
        break;
    }

    if (sentence) {
      setTimeout(() => speakNav(sentence), delay);
      delay += Math.max(4000, distance * 20);
    }
  });
};
