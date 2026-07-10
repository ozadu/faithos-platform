import { ReportTablePage } from '../../components/reporting';

export default function OverdueReportsPage() {
  return (
    <ReportTablePage
      columns={[
        { key: 'documentReference', label: 'Document' },
        { key: 'documentTitle', label: 'Title' },
        { key: 'assignedUser', label: 'Assigned User' },
        { key: 'assignedDepartment', label: 'Department' },
        { key: 'dueAt', label: 'Due Date' },
        { key: 'daysOverdue', label: 'Days Overdue' },
        { key: 'escalationStatus', label: 'Escalation' },
        { key: 'lastNotificationDate', label: 'Last Notification' },
      ]}
      description="Overdue workflow tasks, assignees, departments, escalation status, and notification timing."
      endpoint="/reports/overdue"
      exportPath="/reports/overdue/export.csv"
      title="Overdue Reports"
    />
  );
}
