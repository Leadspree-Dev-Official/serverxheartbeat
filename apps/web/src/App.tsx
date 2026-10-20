import React, { useState, useEffect } from 'react';
import { Shell, TabType } from './components/layout/Shell';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { JobsView } from './components/jobs/JobsView';
import { ActivityView } from './components/activity/ActivityView';
import { WorkerView } from './components/worker/WorkerView';
import { SchedulesView } from './components/schedules/SchedulesView';
import { GuidesView } from './components/guides/GuidesView';
import { SettingsView } from './components/settings/SettingsView';
import { api } from './lib/api';
import {
  Project,
  HeartbeatRun,
  ActivityLog,
  WorkerDeployment,
  Schedule,
  DashboardMetrics,
} from '@heartbeat/shared';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Core Data State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<HeartbeatRun[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [deployments, setDeployments] = useState<WorkerDeployment[]>([]);

  const loadAllData = async () => {
    try {
      const [m, p, j, l, s, d] = await Promise.allSettled([
        api.getMetrics(),
        api.getProjects(),
        api.getJobs(),
        api.getActivityLogs(),
        api.getSchedules(),
        api.getDeployments(),
      ]);

      if (m.status === 'fulfilled') setMetrics(m.value);
      if (p.status === 'fulfilled') setProjects(p.value);
      if (j.status === 'fulfilled') setJobs(j.value);
      if (l.status === 'fulfilled') setLogs(l.value);
      if (s.status === 'fulfilled') setSchedules(s.value);
      if (d.status === 'fulfilled') setDeployments(d.value);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRunAll = async () => {
    await api.triggerManualRun();
    await loadAllData();
  };

  const handleTestProject = async (id: string) => {
    await api.testProject(id);
    await loadAllData();
  };

  return (
    <Shell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      nextRunCountdown="Next: Sunday at 09:00 AM IST (03:30 UTC)"
      onRunAll={handleRunAll}
    >
      {currentTab === 'dashboard' && (
        <DashboardView
          metrics={metrics}
          projects={projects}
          recentRuns={jobs}
          onTestProject={handleTestProject}
          onNavigateProjects={() => setCurrentTab('projects')}
          onNavigateJobs={() => setCurrentTab('jobs')}
          onRefresh={loadAllData}
          isLoading={isLoading}
        />
      )}

      {currentTab === 'projects' && (
        <ProjectsView projects={projects} onRefresh={loadAllData} />
      )}

      {currentTab === 'jobs' && (
        <JobsView jobs={jobs} onRefresh={loadAllData} />
      )}

      {currentTab === 'activity' && (
        <ActivityView logs={logs} onRefresh={loadAllData} />
      )}

      {currentTab === 'worker' && (
        <WorkerView
          deployments={deployments}
          onRefresh={loadAllData}
        />
      )}

      {currentTab === 'schedules' && (
        <SchedulesView
          schedules={schedules}
          projects={projects}
          onRefresh={loadAllData}
        />
      )}

      {currentTab === 'guides' && (
        <GuidesView onNavigateAddProject={() => setCurrentTab('projects')} />
      )}

      {currentTab === 'settings' && <SettingsView />}
    </Shell>
  );
};

export default App;
