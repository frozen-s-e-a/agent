import React from 'react';

interface DataTableProps {
  columns: string[];
  rows: any[][];
}

export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div className="data-table">
      <table>
        <thead><tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j} title={String(v ?? '')}>{String(v ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty-small">没有符合条件的记录</div>}
    </div>
  );
}