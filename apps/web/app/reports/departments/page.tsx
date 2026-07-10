import { ReportTablePage } from '../../components/reporting';

export default function DepartmentReportsPage() {
  return (
    <ReportTablePage
      columns={[
        { key: 'departmentName', label: 'Department' },
        { key: 'documentsReceived', label: 'Received' },
        { key: 'documentsSent', label: 'Sent' },
        { key: 'documentsCompleted', label: 'Completed' },
        { key: 'pendingTasks', label: 'Pending Tasks' },
        { key: 'overdueTasks', label: 'Overdue Tasks' },
        { key: 'averageTurnaroundHours', label: 'Avg Turnaround Hours' },
      ]}
      description="Department workload, sent/received volume, pending and overdue tasks, and recent activity."
      endpoint="/reports/departments"
      title="Department Reports"
    />
  );
}
