import { ReportTablePage } from '../../components/reporting';

export default function WorkflowReportsPage() {
  return (
    <ReportTablePage
      columns={[
        { key: 'workflowName', label: 'Workflow' },
        { key: 'documentReference', label: 'Document' },
        { key: 'currentStep', label: 'Current Step' },
        { key: 'currentAssignee', label: 'Assignee' },
        { key: 'currentDepartment', label: 'Department' },
        { key: 'status', label: 'Status' },
        { key: 'slaStatus', label: 'SLA' },
        { key: 'totalDurationHours', label: 'Duration Hours' },
      ]}
      description="Workflow status, current step, assignee, SLA state, overdue state, and duration."
      endpoint="/reports/workflows"
      exportPath="/reports/workflows/export.csv"
      title="Workflow Reports"
    />
  );
}
