import React from 'react';
import { useOnlineStatus } from '../hooks/useCustomHooks';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="position-fixed bottom-0 start-0 end-0 bg-warning text-dark text-center py-2"
      style={{ zIndex: 9999 }}
    >
      <strong>📡 You're offline</strong> — Changes will be saved locally
    </div>
  );
}
