import { subscribeRealtimeEvents } from '../utils/realtimeBus.js';

export const streamEvents = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const push = (eventName, data) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  push('connected', {
    success: true,
    userId: req.user?._id,
    message: 'Realtime stream connected',
    timestamp: new Date().toISOString(),
  });

  const unsubscribe = subscribeRealtimeEvents((event) => {
    push('message', event);
  });

  const heartbeat = setInterval(() => {
    push('heartbeat', { timestamp: new Date().toISOString() });
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
};
