import { ReportTablePage } from '../../components/reporting';

export default function UserReportsPage() {
  return (
    <ReportTablePage
      columns={[
        { key: 'user', label: 'User' },
        { key: 'documentsCreated', label: 'Documents Created' },
        { key: 'tasksReceived', label: 'Tasks Received' },
        { key: 'tasksApproved', label: 'Approved' },
        { key: 'tasksRejected', label: 'Rejected' },
        { key: 'tasksReturned', label: 'Returned' },
        { key: 'tasksForwarded', label: 'Forwarded' },
        { key: 'tasksCompleted', label: 'Completed' },
        { key: 'averageResponseHours', label: 'Avg Response Hours' },
        { key: 'lastActivityDate', label: 'Last Activity' },
      ]}
      description="User document creation, workflow actions, response time, and last activity."
      endpoint="/reports/users"
      title="User Activity Reports"
    />
  );
}
