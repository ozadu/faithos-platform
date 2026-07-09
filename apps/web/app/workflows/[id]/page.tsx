import { WorkflowDetailClient } from './workflow-detail-client';

export default function WorkflowDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  return <WorkflowDetailClient id={params.id} />;
}
