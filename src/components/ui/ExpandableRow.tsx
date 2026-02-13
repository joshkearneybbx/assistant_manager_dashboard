import { ReactNode } from 'react';

interface ExpandableRowProps {
  colSpan: number;
  children: ReactNode;
}

export function ExpandableRow({ colSpan, children }: ExpandableRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="bg-sand-100 p-4">
        {children}
      </td>
    </tr>
  );
}
