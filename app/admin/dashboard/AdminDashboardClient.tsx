'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueGetterParams, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface CounterData {
  _id: string;
  doorId: string;
  timestamp: string;
  ipAddress?: string;
  userName?: string;
}

interface DoorSummary {
  doorId: string;
  doorName: string;
  count: number;
  lastUpdated: string | null;
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const [doors, setDoors] = useState<DoorSummary[]>([]);
  const [allCounters, setAllCounters] = useState<CounterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const doorNames: Record<string, string> = {
    'door-1': 'Main Entrance',
    'door-2': 'Side Door',
    'door-3': 'Back Door',
  };

  // Utility function to process counter data and calculate door statistics
  const processCounterData = useCallback((counters: CounterData[], doorCounts: Record<string, number>) => {
    const doorIds = ['door-1', 'door-2', 'door-3'];
    
    return doorIds.map((doorId) => {
      // Filter counters for this door
      const doorCounters = counters.filter((c) => c.doorId === doorId);
      
      // Sort by timestamp to get the latest
      const sortedCounters = doorCounters.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Get latest timestamp
      const latestCounter = sortedCounters[0];
      
      // Get count from backend aggregation
      const count = doorCounts[doorId] || 0;
      
      return {
        doorId,
        doorName: doorNames[doorId] || doorId,
        count,
        lastUpdated: latestCounter?.timestamp || null,
      };
    });
  }, []);

  // AG Grid column definitions
  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'doorId',
        headerName: 'Door',
        width: 150,
        valueGetter: (params: ValueGetterParams) => doorNames[params.data.doorId] || params.data.doorId,
        sortable: true,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
      },
      {
        field: 'userName',
        headerName: 'Name',
        width: 150,
        sortable: true,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        valueGetter: (params: ValueGetterParams) => params.data.userName || 'Anonymous',
      },
      {
        field: 'ipAddress',
        headerName: 'IP Address',
        width: 150,
        sortable: true,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        valueGetter: (params: ValueGetterParams) => params.data.ipAddress || 'N/A',
        cellStyle: () => ({ fontFamily: 'monospace', fontSize: '0.875rem' }),
      },
      {
        field: 'timestamp',
        headerName: 'Timestamp',
        width: 200,
        sortable: true,
        filter: 'agDateColumnFilter',
        floatingFilter: true,
        filterParams: {
          comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
            const cellDate = new Date(cellValue);
            if (cellDate < filterLocalDateAtMidnight) {
              return -1;
            } else if (cellDate > filterLocalDateAtMidnight) {
              return 1;
            } else {
              return 0;
            }
          },
        },
        valueGetter: (params: ValueGetterParams) => new Date(params.data.timestamp).toLocaleString(),
        comparator: (valueA: any, valueB: any, nodeA: any, nodeB: any) => {
          const dateA = new Date(nodeA.data.timestamp).getTime();
          const dateB = new Date(nodeB.data.timestamp).getTime();
          return dateA - dateB;
        },
      },
    ],
    []
  );

  // Default column properties
  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      floatingFilter: true,
    }),
    []
  );

  const fetchData = useCallback(async (isInitialLoad = false) => {
    try {
      const response = await fetch('/api/counters');
      const result = await response.json();

      if (result.success) {
        setAllCounters(result.data);

        // Process counter data to get door summaries using aggregated counts from backend
        const summaries = processCounterData(result.data, result.doorCounts || {});
        setDoors(summaries);
      }
    } catch (error) {
      console.error('Error fetching counters:', error);
    } finally {
      // Only set loading to false on initial load
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [processCounterData]);

  useEffect(() => {
    // Initial load
    fetchData(true);
    
    // Set up interval to refresh data every minute
    const interval = setInterval(() => {
      fetchData(false);
    }, 60000); // 60000ms = 1 minute

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleReset = async (doorId?: string) => {
    if (
      !confirm(
        doorId
          ? `Are you sure you want to reset ${doorNames[doorId]}?`
          : 'Are you sure you want to reset ALL counters?'
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doorId }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        fetchData(false);
      } else {
        alert('Failed to reset: ' + result.error);
      }
    } catch (error) {
      console.error('Error resetting:', error);
      alert('Failed to reset counters');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Manage all door counters</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Door Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {doors.map((door) => (
                <div
                  key={door.doorId}
                  className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200"
                >
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {door.doorName}
                  </h2>
                  
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-gray-600">Count:</span>
                      <span className="text-4xl font-bold text-blue-600">
                        {door.count}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-4">
                    {door.lastUpdated
                      ? `Last updated: ${new Date(
                          door.lastUpdated
                        ).toLocaleString()}`
                      : 'No data yet'}
                  </p>
                  <button
                    onClick={() => handleReset(door.doorId)}
                    disabled={isResetting}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Reset Counter
                  </button>
                </div>
              ))}
            </div>

            {/* Reset All Button */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Bulk Actions
              </h2>
              <button
                onClick={() => handleReset()}
                disabled={isResetting}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isResetting ? 'Resetting...' : 'Reset All Counters'}
              </button>
            </div>

            {/* All Counter Records */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                All Counter Records
              </h2>
              <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
                <AgGridReact
                  rowData={allCounters.sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime()
                  )}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  pagination={true}
                  paginationPageSize={20}
                  animateRows={true}
                  rowSelection="single"
                  suppressRowClickSelection={false}
                  domLayout="normal"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
