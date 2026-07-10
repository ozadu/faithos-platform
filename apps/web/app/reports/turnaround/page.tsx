import { ReportTablePage } from '../../components/reporting';

export default function TurnaroundReportsPage() {
  return (
    <ReportTablePage
      columns={[
        { key: 'documentReference', label: 'Document' },
        { key: 'documentTitle', label: 'Title' },
        { key: 'creationToSubmissionHours', label: 'Creation → Submission' },
        {
          key: 'submissionToCompletionHours',
          label: 'Submission → Completion',
        },
        { key: 'stepDurations', label: 'Step Durations' },
      ]}
      description="Creation-to-submission, submission-to-completion, workflow step, approval, and department processing duration."
      endpoint="/reports/turnaround"
      title="Turnaround Reports"
    />
  );
}
