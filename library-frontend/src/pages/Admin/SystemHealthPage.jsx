import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import systemHealthService from '../../api/systemHealthService';
import {
  ServerStackIcon,
  CircleStackIcon,
  CloudIcon,
  UsersIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const SystemHealthPage = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await systemHealthService.getSystemHealth();
      setHealthData(data);
    } catch (error) {
      toast.error('Failed to fetch system health data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  if (loading && !healthData) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-7xl mx-auto space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ServerStackIcon className="h-6 w-6 text-indigo-600" />
            System Health
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time monitor for backend services, database, and storage.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {healthData?.generated_at && (
            <span className="text-sm text-slate-500 hidden sm:inline-block">
              Last updated: {new Date(healthData.generated_at).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchHealthData}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {healthData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Server Info Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <ServerStackIcon className="h-5 w-5 text-blue-500" /> Server
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${healthData.server.environment === 'production' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {healthData.server.environment.toUpperCase()}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Python</span>
                  <span className="font-medium">{healthData.server.python_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">FastAPI</span>
                  <span className="font-medium">{healthData.server.fastapi_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uptime</span>
                  <span className="font-medium">
                    {Math.floor(healthData.server.uptime_seconds / 3600)}h {Math.floor((healthData.server.uptime_seconds % 3600) / 60)}m
                  </span>
                </div>
              </div>
            </div>

            {/* DB Health Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <CircleStackIcon className="h-5 w-5 text-indigo-500" /> Database
                </h3>
                {healthData.database.status === 'healthy' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <CheckCircleIcon className="h-4 w-4" /> Healthy
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                    <ExclamationTriangleIcon className="h-4 w-4" /> Issue
                  </span>
                )}
              </div>
              <div className="mt-6 flex flex-col items-center justify-center text-center">
                <div className="text-3xl font-bold text-slate-800">
                  {Object.keys(healthData.database.tables).length}
                </div>
                <span className="text-sm text-slate-500">Tracked Tables</span>
              </div>
            </div>

            {/* Storage Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <CloudIcon className="h-5 w-5 text-sky-500" /> Local Storage
                </h3>
              </div>
              <div className="mt-4">
                <div className="flex items-end justify-between mb-2">
                  <div className="text-3xl font-bold text-slate-800">
                    {healthData.storage.local_uploads_size_mb}
                    <span className="text-lg text-slate-500 font-normal ml-1">MB</span>
                  </div>
                </div>
                {/* Visual indicator (mock usage out of an arbitrary limit like 5GB) */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                  <div 
                    className="bg-sky-500 h-2.5 rounded-full" 
                    style={{ width: `${Math.min((healthData.storage.local_uploads_size_mb / 5000) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-sm text-slate-500 flex justify-between">
                  <span>{healthData.storage.local_uploads_file_count} Files</span>
                  <span>~5GB Limit</span>
                </div>
              </div>
            </div>

            {/* User Sessions Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-emerald-500" /> Users
                </h3>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-1 rounded-full">
                  {healthData.active_sessions.active_users} Active
                </span>
              </div>
              <div className="space-y-3 text-sm mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Total Users</span>
                  <span className="font-semibold text-slate-700">{healthData.active_sessions.total_users}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Active</span>
                  <span className="font-semibold text-emerald-600">{healthData.active_sessions.active_users}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Suspended</span>
                  <span className="font-semibold text-rose-600">{healthData.active_sessions.suspended_users}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Database Tables Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-700">Database Tables Statistics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Table Name</th>
                    <th className="px-6 py-3 font-medium text-right">Row Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {Object.entries(healthData.database.tables).map(([tableName, data]) => (
                    <tr key={tableName} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700 capitalize">
                        {tableName.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full text-xs font-semibold">
                          {data.row_count.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default SystemHealthPage;
