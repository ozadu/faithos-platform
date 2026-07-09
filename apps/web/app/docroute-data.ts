export type DocumentRow = {
  id: string;
  reference: string;
  title: string;
  fromDepartment: string;
  currentDepartment: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'IN_REVIEW'
    | 'FORWARDED'
    | 'RETURNED'
    | 'APPROVED'
    | 'REJECTED'
    | 'ARCHIVED';
  receivedDate: string;
  unread: boolean;
};

export const documents: DocumentRow[] = [
  {
    currentDepartment: 'Executive Office',
    fromDepartment: 'Finance',
    id: 'sample-1',
    priority: 'HIGH',
    receivedDate: '2026-07-09',
    reference: 'DOC-2026-000003',
    status: 'FORWARDED',
    title: 'Q3 budget approval',
    unread: true,
  },
  {
    currentDepartment: 'Executive Office',
    fromDepartment: 'People',
    id: 'sample-2',
    priority: 'NORMAL',
    receivedDate: '2026-07-09',
    reference: 'DOC-2026-000004',
    status: 'IN_REVIEW',
    title: 'Staff onboarding checklist',
    unread: false,
  },
  {
    currentDepartment: 'Operations',
    fromDepartment: 'Operations',
    id: 'sample-3',
    priority: 'NORMAL',
    receivedDate: '2026-07-08',
    reference: 'DOC-2026-000002',
    status: 'SUBMITTED',
    title: 'Facility maintenance request',
    unread: false,
  },
];

export const timeline = [
  ['Created', 'Draft created by Demo Administrator', '2026-07-09 09:00'],
  ['Submitted', 'Submitted by Finance', '2026-07-09 09:30'],
  ['Forwarded', 'Forwarded to Executive Office', '2026-07-09 10:15'],
  ['Received', 'Marked as received for review', '2026-07-09 10:45'],
] as const;

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
