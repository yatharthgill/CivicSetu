import { EventEmitter } from 'events';

const realtimeBus = new EventEmitter();
realtimeBus.setMaxListeners(200);

export const publishRealtimeEvent = (type, payload = {}) => {
  realtimeBus.emit('event', {
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
};

export const subscribeRealtimeEvents = (handler) => {
  realtimeBus.on('event', handler);
  return () => realtimeBus.off('event', handler);
};
