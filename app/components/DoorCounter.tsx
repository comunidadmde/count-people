'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface DoorCounterProps {
  doorId: string;
  doorName: string;
  initialCount?: number;
}

interface QueuedClick {
  id: string;
  doorId: string;
  auditorium?: string;
  userName: string;
  passwordHash: string; // Store password hash for verification
  timestamp: number;
  ipAddress?: string;
  retryCount?: number;
  lastRetry?: number;
}

export default function DoorCounter({
  doorId,
  doorName,
  initialCount = 0,
}: DoorCounterProps) {
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [pendingClicks, setPendingClicks] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const passwordHashRef = useRef<string>(''); // Store password hash for quick verification
  const clickQueueRef = useRef<QueuedClick[]>([]);
  const isProcessingRef = useRef(false);
  const [auditoriumTotal, setAuditoriumTotal] = useState<number | null>(null);
  const [auditoriumName, setAuditoriumName] = useState<string | null>(null);

  // Save queue to localStorage with error handling
  const saveQueueToStorage = useCallback(() => {
    try {
      localStorage.setItem(`counter-queue-${doorId}`, JSON.stringify(clickQueueRef.current));
    } catch (error) {
      console.error('Error saving queue to localStorage:', error);
      // If localStorage is full, try to clear old data
      try {
        const keys = Object.keys(localStorage);
        const queueKeys = keys.filter((k) => k.startsWith('counter-queue-'));
        if (queueKeys.length > 10) {
          // Keep only the most recent 10 queues
          queueKeys.sort().slice(0, -10).forEach((key) => {
            localStorage.removeItem(key);
          });
          // Try again
          localStorage.setItem(`counter-queue-${doorId}`, JSON.stringify(clickQueueRef.current));
        }
      } catch (retryError) {
        console.error('Failed to save queue even after cleanup:', retryError);
      }
    }
  }, [doorId]);

  // Helper function to handle password verification failures
  const handlePasswordVerificationFailure = useCallback(() => {
    // Stop processing
    isProcessingRef.current = false;
    setIsSyncing(false);
    
    // Clear authentication
    setIsAuthenticated(false);
    setShowPasswordInput(true);
    passwordHashRef.current = '';
    sessionStorage.removeItem(`door-auth-${doorId}`);
    setPasswordError('Password verification failed. Please enter password again.');
    // Clear password field
    setPassword('');
    
    // Clear all pending clicks from queue
    clickQueueRef.current = [];
    setPendingClicks(0);
    
    // Remove from localStorage
    try {
      localStorage.removeItem(`counter-queue-${doorId}`);
    } catch (error) {
      console.error('Error clearing queue from localStorage:', error);
    }
  }, [doorId]);

  // Process the queue and send to backend with retry logic
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || clickQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsSyncing(true);

    try {
      // Filter out clicks that are being retried too soon (exponential backoff)
      const now = Date.now();
      const queueToSend = clickQueueRef.current.filter((click) => {
        if (!click.lastRetry) return true;
        const retryCount = click.retryCount || 0;
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
        return now - click.lastRetry >= backoffDelay;
      });

      if (queueToSend.length === 0) {
        // All clicks are in backoff, wait a bit
        isProcessingRef.current = false;
        setIsSyncing(false);
        return;
      }

      // Process in batches of 50 to avoid timeouts
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < queueToSend.length; i += batchSize) {
        batches.push(queueToSend.slice(i, i + batchSize));
      }

      let totalSent = 0;
      const sentIds = new Set<string>();

      for (const batch of batches) {
        try {
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

          const response = await fetch('/api/counters/batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clicks: batch,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            // Check if it's a password verification error (401 Unauthorized)
            if (response.status === 401) {
              // Password verification failed - require re-authentication
              handlePasswordVerificationFailure();
              // Stop processing - don't retry these clicks
              return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          
          // Check for password verification errors in response
          if (result.error && (
            result.error.includes('Password') || 
            result.error.includes('verification') ||
            result.error.includes('authenticate')
          )) {
            handlePasswordVerificationFailure();
            return;
          }
          
          if (result.success) {
            // All clicks in batch succeeded
            batch.forEach((click) => {
              sentIds.add(click.id);
              totalSent += 1;
            });
          } else if (result.insertedCount > 0) {
            // Partial success - some clicks were inserted
            // Since we can't track which specific ones, we'll assume all succeeded
            // (MongoDB insertMany with ordered:false will insert as many as possible)
            batch.forEach((click) => {
              sentIds.add(click.id);
              totalSent += 1;
            });
            console.warn(`Partial batch success: ${result.insertedCount}/${batch.length} inserted`);
          } else {
            // Complete failure - increment retry count
            batch.forEach((click) => {
              click.retryCount = (click.retryCount || 0) + 1;
              click.lastRetry = Date.now();
            });
          }
        } catch (error) {
          console.error('Error sending batch:', error);
          
          // Check if it's a password-related error (401)
          if (error instanceof Error && (
            error.message.includes('401') || 
            error.message.includes('Password') ||
            error.message.includes('verification')
          )) {
            handlePasswordVerificationFailure();
            return;
          }
          
          // Increment retry count for failed batch
          batch.forEach((click) => {
            click.retryCount = (click.retryCount || 0) + 1;
            click.lastRetry = Date.now();
          });
        }
      }

      // Remove successfully sent clicks from queue
      if (sentIds.size > 0) {
        clickQueueRef.current = clickQueueRef.current.filter(
          (click) => !sentIds.has(click.id)
        );
        setPendingClicks(clickQueueRef.current.length);
        saveQueueToStorage();

        // Fetch updated count and auditorium total from server
        try {
          const countResponse = await fetch(`/api/counters/${doorId}`);
          const countResult = await countResponse.json();
          if (countResult.success && countResult.data) {
            setCount(countResult.data.count || 0);
            // Update auditorium total
            if (countResult.data.auditoriumTotal !== null && countResult.data.auditoriumTotal !== undefined) {
              setAuditoriumTotal(countResult.data.auditoriumTotal);
            }
            if (countResult.data.auditorium) {
              setAuditoriumName(countResult.data.auditorium);
            }
          }
        } catch (error) {
          console.error('Error fetching updated count:', error);
        }

        setLastSaved(new Date());
      }

      // If there are still pending clicks and user is authenticated, schedule another retry
      // Don't retry if authentication failed - user needs to re-authenticate first
      if (clickQueueRef.current.length > 0 && passwordHashRef.current) {
        const maxRetryCount = Math.max(
          ...clickQueueRef.current.map((c) => c.retryCount || 0)
        );
        if (maxRetryCount < 10) {
          // Only retry up to 10 times, and only if still authenticated
          setTimeout(() => {
            if (clickQueueRef.current.length > 0 && passwordHashRef.current) {
              processQueue();
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error syncing queue:', error);
      
      // Check if it's an authentication error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('401') || errorMessage.includes('Password') || errorMessage.includes('verification')) {
        handlePasswordVerificationFailure();
        return; // Stop processing - don't retry
      }
      
      // Increment retry count for all clicks (only for non-auth errors)
      clickQueueRef.current.forEach((click) => {
        click.retryCount = (click.retryCount || 0) + 1;
        click.lastRetry = Date.now();
      });
      saveQueueToStorage();
    } finally {
      setIsSyncing(false);
      isProcessingRef.current = false;
    }
  }, [doorId, saveQueueToStorage, handlePasswordVerificationFailure]);

  // Load user name and pending queue from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('counter-user-name');
    if (savedName) {
      setUserName(savedName);
    } else {
      setShowNameInput(true);
    }

    // Load pending clicks queue from localStorage
    const savedQueue = localStorage.getItem(`counter-queue-${doorId}`);
    if (savedQueue) {
      try {
        const queue = JSON.parse(savedQueue);
        clickQueueRef.current = queue;
        const pendingCount = queue.length;
        setPendingClicks(pendingCount);
        
        // Fetch server count and add pending clicks to it
        fetch(`/api/counters/${doorId}`)
          .then((res) => res.json())
          .then((result) => {
            if (result.success && result.data) {
              const serverCount = result.data.count || 0;
              setCount(serverCount + pendingCount);
              // Update auditorium total
              if (result.data.auditoriumTotal !== null && result.data.auditoriumTotal !== undefined) {
                setAuditoriumTotal(result.data.auditoriumTotal);
              }
              if (result.data.auditorium) {
                setAuditoriumName(result.data.auditorium);
              }
            }
          })
          .catch((error) => {
            console.error('Error fetching count:', error);
          });
        
        // Try to sync on mount
        setTimeout(() => processQueue(), 1000);
      } catch (error) {
        console.error('Error loading queue:', error);
      }
    }
  }, [doorId, processQueue]);

  // Check if already authenticated (stored in sessionStorage)
  useEffect(() => {
    const authKey = `door-auth-${doorId}`;
    const storedHash = sessionStorage.getItem(authKey);
    if (storedHash) {
      setIsAuthenticated(true);
      setShowPasswordInput(false);
      passwordHashRef.current = storedHash;
    } else {
      // If not authenticated, check if there are pending clicks that need password
      const savedQueue = localStorage.getItem(`counter-queue-${doorId}`);
      if (savedQueue) {
        try {
          const queue = JSON.parse(savedQueue);
          if (queue.length > 0 && queue[0].passwordHash) {
            // Restore password hash from first click in queue
            passwordHashRef.current = queue[0].passwordHash;
            setIsAuthenticated(true);
            setShowPasswordInput(false);
            sessionStorage.setItem(authKey, queue[0].passwordHash);
          }
        } catch (error) {
          console.error('Error parsing queue:', error);
        }
      }
    }
  }, [doorId]);

  // Fetch count and auditorium total on mount
  useEffect(() => {
    async function fetchCount() {
      try {
        const countResponse = await fetch(`/api/counters/${doorId}`);
        const countResult = await countResponse.json();
        if (countResult.success && countResult.data) {
          const serverCount = countResult.data.count || 0;
          
          // Only update if we don't have pending clicks
          if (clickQueueRef.current.length === 0) {
            setCount(serverCount);
          } else {
            setCount(serverCount + clickQueueRef.current.length);
          }

          // Update auditorium total and name
          if (countResult.data.auditoriumTotal !== null && countResult.data.auditoriumTotal !== undefined) {
            setAuditoriumTotal(countResult.data.auditoriumTotal);
          }
          if (countResult.data.auditorium) {
            setAuditoriumName(countResult.data.auditorium);
          }
        }
      } catch (error) {
        console.error('Error fetching count:', error);
      }
    }
    // Delay fetch to allow queue to load first
    setTimeout(() => fetchCount(), 100);
  }, [doorId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    const passwordInput = (e.target as HTMLFormElement).elements.namedItem('password') as HTMLInputElement;
    const enteredPassword = passwordInput.value.trim();
    
    if (!enteredPassword) {
      setPasswordError('Password is required');
      return;
    }

    try {
      const response = await fetch('/api/doors/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doorId,
          password: enteredPassword,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Create a simple hash of the password for verification (not for security, just for quick check)
        // In production, you might want to use a proper hash, but for speed we'll use a simple one
        const hash = btoa(enteredPassword).substring(0, 16); // Simple encoding for quick verification
        passwordHashRef.current = hash;
        setIsAuthenticated(true);
        setShowPasswordInput(false);
        setPassword('');
        setPasswordError(''); // Clear any previous errors
        // Store password hash in sessionStorage (cleared on browser close)
        sessionStorage.setItem(`door-auth-${doorId}`, hash);
        
        // Try to sync any pending clicks now that we're authenticated
        if (clickQueueRef.current.length > 0) {
          setTimeout(() => processQueue(), 500);
        }
      } else {
        setPasswordError(result.error || 'Invalid password');
        setPassword('');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      setPasswordError('Failed to verify password. Please try again.');
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameInput = (e.target as HTMLFormElement).elements.namedItem('name') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (name) {
      setUserName(name);
      localStorage.setItem('counter-user-name', name);
      setShowNameInput(false);
    }
  };

  const handleNameChange = () => {
    setShowNameInput(true);
  };

  // Add click to queue
  const addClickToQueue = useCallback(() => {
    if (!passwordHashRef.current) {
      // Re-verify password if hash is missing
      setShowPasswordInput(true);
      setIsAuthenticated(false);
      return;
    }

    const click: QueuedClick = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      doorId,
      userName: userName.trim(),
      passwordHash: passwordHashRef.current,
      timestamp: Date.now(),
      retryCount: 0,
    };

    clickQueueRef.current.push(click);
    const newPendingCount = clickQueueRef.current.length;
    setPendingClicks(newPendingCount);
    
    // Save to localStorage immediately (critical for persistence)
    try {
      localStorage.setItem(`counter-queue-${doorId}`, JSON.stringify(clickQueueRef.current));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
    // Try to process queue immediately (non-blocking)
    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        processQueue();
      }, { timeout: 500 });
    } else {
      setTimeout(() => {
        processQueue();
      }, 100);
    }
  }, [doorId, userName, processQueue]);

  const incrementAndSave = () => {
    // Check if name is set
    if (!userName || userName.trim() === '') {
      setShowNameInput(true);
      alert('Please enter your name first');
      return;
    }

    // Add to queue immediately (no waiting for network)
    addClickToQueue();
  };

  // Auto-sync queue periodically and on visibility change
  useEffect(() => {
    // Sync immediately if there are pending clicks
    if (clickQueueRef.current.length > 0) {
      processQueue();
    }

    // Periodic sync
    const interval = setInterval(() => {
      if (clickQueueRef.current.length > 0 && !isProcessingRef.current) {
        processQueue();
      }
    }, 3000); // Try to sync every 3 seconds

    // Periodic refresh of auditorium total (every 5 seconds)
    const auditoriumRefreshInterval = setInterval(async () => {
      try {
        const countResponse = await fetch(`/api/counters/${doorId}`);
        const countResult = await countResponse.json();
        if (countResult.success && countResult.data) {
          if (countResult.data.auditoriumTotal !== null && countResult.data.auditoriumTotal !== undefined) {
            setAuditoriumTotal(countResult.data.auditoriumTotal);
          }
          if (countResult.data.auditorium) {
            setAuditoriumName(countResult.data.auditorium);
          }
        }
      } catch (error) {
        console.error('Error refreshing auditorium total:', error);
      }
    }, 5000); // Refresh every 5 seconds

    // Sync when page becomes visible (user comes back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && clickQueueRef.current.length > 0 && !isProcessingRef.current) {
        processQueue();
      }
    };

    // Sync before page unload
    const handleBeforeUnload = () => {
      if (clickQueueRef.current.length > 0) {
        // Try to sync one last time
        navigator.sendBeacon?.(
          '/api/counters/batch',
          JSON.stringify({ clicks: clickQueueRef.current })
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      clearInterval(auditoriumRefreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [processQueue, doorId]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{doorName}</h2>
      
      {/* Password Input Section */}
      {showPasswordInput ? (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Enter door password:
            </label>
            <div className="flex gap-2">
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Password"
                required
                className="flex-1 px-4 py-2 bg-white border-2 border-gray-400 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Verify
              </button>
            </div>
            {passwordError && (
              <p className="text-sm text-red-600 mt-1">{passwordError}</p>
            )}
          </form>
        </div>
      ) : (
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-600">
            Authenticated ✓
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setShowPasswordInput(true);
                localStorage.removeItem(`door-auth-${doorId}`);
              }}
              className="ml-2 text-blue-500 hover:text-blue-700 text-xs underline"
            >
              Change Password
            </button>
          </p>
        </div>
      )}
      
      {/* Name Input Section */}
      {!showPasswordInput && showNameInput ? (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <form onSubmit={handleNameSubmit} className="space-y-3">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Enter your name:
            </label>
            <div className="flex gap-2">
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={userName}
                placeholder="Your name"
                required
                className="flex-1 px-4 py-2 bg-white border-2 border-gray-400 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-600">
            Counting as: <span className="font-semibold text-blue-600">{userName}</span>
            <button
              onClick={handleNameChange}
              className="ml-2 text-blue-500 hover:text-blue-700 text-xs underline"
            >
              Change
            </button>
          </p>
        </div>
      )}
      
      <div className="text-center mb-10">
        <div className="text-8xl font-bold text-blue-600 mb-3">
          {count + pendingClicks}
        </div>
        <p className="text-lg text-gray-500">Total Count</p>
        {pendingClicks > 0 && (
          <p className="text-xs text-yellow-600 mt-1">
            ({count} saved + {pendingClicks} pending)
          </p>
        )}
      </div>

      {/* Auditorium Global Counter - Small at bottom */}
      {auditoriumTotal !== null && auditoriumName && (
        <div className="my-4 pt-4 border-t border-gray-200">
          <p className="text-l text-gray-400 text-center">
            <span className="font-medium text-gray-500">{auditoriumName}</span> Total: <span className="font-semibold text-gray-600">{auditoriumTotal}</span>
          </p>
        </div>
      )}

      <button
        onClick={incrementAndSave}
        disabled={showNameInput || !isAuthenticated}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-bold text-3xl py-12 px-6 rounded-xl transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 duration-200"
      >
        {!isAuthenticated ? 'Enter Password First' : '+ Count Person'}
      </button>

      {/* Pending clicks indicator */}
      {pendingClicks > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSyncing ? (
                <svg className="animate-spin h-4 w-4 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <div className="flex flex-col">
                <span className="text-sm text-yellow-800 font-medium">
                  {pendingClicks} {pendingClicks === 1 ? 'click' : 'clicks'} pending sync
                </span>
                {clickQueueRef.current.some((c) => (c.retryCount || 0) > 0) && (
                  <span className="text-xs text-yellow-700 mt-0.5">
                    Retrying automatically...
                  </span>
                )}
              </div>
            </div>
            {!isSyncing && (
              <button
                onClick={processQueue}
                className="text-xs text-yellow-700 hover:text-yellow-900 underline font-medium"
              >
                Sync Now
              </button>
            )}
          </div>
        </div>
      )}

      {lastSaved && pendingClicks === 0 && (
        <p className="text-sm text-gray-500 mt-6 text-center">
          ✓ Last saved: {lastSaved.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
