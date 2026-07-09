import type { ReactNode } from 'react';

export type UiComponentProps = Readonly<{
  children?: ReactNode;
  className?: string;
}>;
