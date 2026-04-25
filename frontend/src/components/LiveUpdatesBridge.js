'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const trackedQueryRoots = ['reports', 'report', 'report-status', 'admin-reports', 'admin-stats'];

export default function LiveUpdatesBridge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    const streamUrl = `${apiBase}/events/stream`;

    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const payload = parsed?.payload || {};

        queryClient.invalidateQueries({
          predicate: (query) => trackedQueryRoots.includes(String(query.queryKey?.[0] || '')),
        });

        if (payload.reportId) {
          queryClient.invalidateQueries({ queryKey: ['report', payload.reportId] });
        }

        if (parsed?.type === 'report:status_changed' && payload.userId?.toString?.() === user.id?.toString?.()) {
          const nextStatus = (payload.status || '').replace('_', ' ');
          if (nextStatus) {
            toast.success(`Your report status changed to ${nextStatus}`);
          }
        }
      } catch (err) {
        console.error('Realtime event parse failed:', err);
      }
    };

    eventSource.onerror = () => {
      // Browser will auto-reconnect for SSE; no manual retry needed.
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient, user]);

  return null;
}
