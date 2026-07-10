import { ReportTablePage } from '../../components/reporting';

export default function DocumentReportsPage() {
  return (
    <ReportTablePage
      columns={[
        { key: 'referenceNumber', label: 'Reference' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'confidentiality', label: 'Confidentiality' },
        { key: 'createdBy', label: 'Created By' },
        { key: 'currentDepartment', label: 'Current Department' },
        { key: 'submittedDate', label: 'Submitted' },
        { key: 'completedDate', label: 'Completed' },
        { key: 'currentWorkflowStatus', label: 'Workflow Status' },
      ]}
      description="Documents by status, priority, department, owner, confidentiality, date range, and workflow status."
      endpoint="/reports/documents"
      exportPath="/reports/documents/export.csv"
      title="Document Reports"
    />
  );
}
