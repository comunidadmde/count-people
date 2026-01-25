'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ValueGetterParams, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface CounterData {
  _id: string;
  doorId: string;
  auditorium?: string;
  timestamp: string;
  ipAddress?: string;
  userName?: string;
}

interface DoorSummary {
  doorId: string;
  doorName: string;
  auditorium: string;
  count: number;
  lastUpdated: string | null;
}

interface DoorInfo {
  doorId: string;
  doorName: string;
  auditorium: string;
}

export default function AdminDashboardClient() {
  const t = useTranslations('admin.dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [doors, setDoors] = useState<DoorSummary[]>([]);
  const [allCounters, setAllCounters] = useState<CounterData[]>([]);
  const [doorInfos, setDoorInfos] = useState<Record<string, DoorInfo>>({});
  const [auditoriumTotals, setAuditoriumTotals] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // Removed processCounterData - logic moved into fetchData to avoid dependency issues

  // AG Grid column definitions - responsive widths
  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: 'doorId',
        headerName: t('door'),
        minWidth: 120,
        flex: 1,
        valueGetter: (params: ValueGetterParams) => {
          const doorId = params.data?.doorId;
          return doorInfos[doorId]?.doorName || doorId || '';
        },
        sortable: true,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
      },
      {
        field: 'auditorium',
        headerName: t('auditorium'),
        minWidth: 120,
        flex: 1,
        sortable: true,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        valueGetter: (params: ValueGetterParams) => {
          const doorId = params.data?.doorId;
          return doorInfos[doorId]?.auditorium || params.data?.auditorium || t('unassigned');
        },
      },
      {
        field: 'userName',
        headerName: t('userName'),
        minWidth: 120,
        flex: 1,
        sortable: true,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        valueGetter: (params: ValueGetterParams) => params.data?.userName || t('anonymous'),
      },
      {
        field: 'ipAddress',
        headerName: t('ipAddress'),
        minWidth: 120,
        flex: 1,
        sortable: true,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        valueGetter: (params: ValueGetterParams) => params.data?.ipAddress || t('nA'),
        cellStyle: () => ({ fontFamily: 'monospace', fontSize: '0.875rem' }),
      },
      {
        field: 'timestamp',
        headerName: t('timestamp'),
        minWidth: 180,
        flex: 1.2,
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
        valueGetter: (params: ValueGetterParams) => {
          const timestamp = params.data?.timestamp;
          return timestamp ? new Date(timestamp).toLocaleString() : '';
        },
        comparator: (valueA: any, valueB: any, nodeA: any, nodeB: any) => {
          const dateA = nodeA.data?.timestamp ? new Date(nodeA.data.timestamp).getTime() : 0;
          const dateB = nodeB.data?.timestamp ? new Date(nodeB.data.timestamp).getTime() : 0;
          return dateA - dateB;
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doorInfos, locale] // Include doorInfos and locale so column updates when doors are loaded or language changes. 't' is stable and changes with locale.
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
      // Fetch doors info first
      const doorsResponse = await fetch('/api/doors');
      const doorsResult = await doorsResponse.json();
      let doorsMap: Record<string, DoorInfo> = {};
      if (doorsResult.success) {
        doorsResult.data.forEach((door: DoorInfo) => {
          doorsMap[door.doorId] = door;
        });
        setDoorInfos(doorsMap);
      }

      // Fetch counters
      const response = await fetch('/api/counters');
      const result = await response.json();

      if (result.success) {
        setAllCounters(result.data);
        setAuditoriumTotals(result.auditoriumTotals || {});

        // Use the latest doorInfos state or the one we just set
        // We need to use a functional update or get the latest value
        setDoors((prevDoors) => {
          // Get door IDs from the doors we just fetched, or use defaults
          const doorIds = Object.keys(doorsMap)
          
          return doorIds.map((doorId) => {
            // Filter counters for this door
            const doorCounters = result.data.filter((c: CounterData) => c.doorId === doorId);
            
            // Sort by timestamp to get the latest
            const sortedCounters = doorCounters.sort(
              (a: CounterData, b: CounterData) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            // Get latest timestamp
            const latestCounter = sortedCounters[0];
            
            // Get count from backend aggregation
            const count = result.doorCounts?.[doorId] || 0;
            
            return {
              doorId,
              doorName: doorsMap[doorId]?.doorName || doorId,
              auditorium: doorsMap[doorId]?.auditorium || 'Unassigned',
              count,
              lastUpdated: latestCounter?.timestamp || null,
            };
          });
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      // Only set loading to false on initial load
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, []); // Remove processCounterData dependency to prevent infinite loop

  useEffect(() => {
    // Initial load
    fetchData(true);
    
    // Set up interval to refresh data every minute
    const interval = setInterval(() => {
      fetchData(false);
    }, 60000); // 60000ms = 1 minute

    // Cleanup interval on unmount
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - fetchData is stable via useCallback

  const handleReset = async (doorId?: string) => {
    const doorName = doorId ? (doorInfos[doorId]?.doorName || doorId) : '';
    if (
      !confirm(
        doorId
          ? tCommon('resetDoorConfirm', { doorName })
          : tCommon('resetAllConfirm')
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
        alert(t('resetFailed') + ': ' + result.error);
      }
    } catch (error) {
      console.error('Error resetting:', error);
      alert(t('resetFailed'));
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
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              {t('title')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">{t('subtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <Link
              href="/admin/doors"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-center text-sm sm:text-base"
            >
              {t('manageDoors')}
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 rounded-lg text-center text-sm sm:text-base"
            >
              {tCommon('home')}
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm sm:text-base"
            >
              {tCommon('logout')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-gray-600">{tCommon('loading')}</p>
          </div>
        ) : (
          <>
            {/* Auditorium Totals */}
            {Object.keys(auditoriumTotals).length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
                  {t('totalsByAuditorium')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(auditoriumTotals)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([auditorium, count]) => (
                      <div
                        key={auditorium}
                        className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200"
                      >
                        <div className="text-sm text-gray-600 mb-1">{auditorium}</div>
                        <div className="text-3xl sm:text-4xl font-bold text-blue-600">{count}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Door Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {doors.map((door) => (
                <div
                  key={door.doorId}
                  className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200"
                >
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    {door.doorName}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('auditorium')}: <span className="font-semibold">{door.auditorium}</span>
                  </p>
                  
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-sm text-gray-600">{t('count')}:</span>
                      <span className="text-4xl font-bold text-blue-600">
                        {door.count}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-4">
                    {door.lastUpdated
                      ? `${t('lastUpdated')}: ${new Date(
                          door.lastUpdated
                        ).toLocaleString()}`
                      : tCommon('noData')}
                  </p>
                  <button
                    onClick={() => handleReset(door.doorId)}
                    disabled={isResetting}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {tCommon('resetCounter')}
                  </button>
                </div>
              ))}
            </div>

            {/* Reset All Button */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
                {t('bulkActions')}
              </h2>
              <button
                onClick={() => handleReset()}
                disabled={isResetting}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-sm sm:text-base"
              >
                {isResetting ? tCommon('resetting') : tCommon('resetAll')}
              </button>
            </div>

            {/* All Counter Records */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 overflow-hidden">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
                {t('allCounterRecords')}
              </h2>
              <div className="w-full overflow-x-auto">
                <div className="ag-theme-alpine" style={{ height: '400px', minWidth: '100%', width: '100%' }}>
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
            </div>
          </>
        )}
      </div>
    </main>
  );
}
