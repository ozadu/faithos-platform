import { ReportTablePage } from '../../components/reporting';

export default function ActivityReportsPage() {
  return (
    <ReportTablePage
      columns={[
        { key: 'timestamp', label: 'Timestamp' },
        { key: 'actor', label: 'Actor' },
        { key: 'action', label: 'Action' },
        { key: 'entityType', label: 'Entity Type' },
        { key: 'entityReference', label: 'Entity Reference' },
        { key: 'department', label: 'Department' },
        { key: 'comment', label: 'Comment' },
      ]}
      description="Workflow history, document timeline, and audit activity in one management review feed."
      endpoint="/reports/activity"
      exportPath="/reports/activity/export.csv"
      title="Activity Reports"
    />
  );
}
