import { BRANDING } from "../../lib/branding";

export default function DataTable({ columns, rows, emptyState, onRowClick }) {
  if (!rows || rows.length === 0) {
    return emptyState;
  }

  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={styles.head}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              style={{ ...styles.row, cursor: onRowClick ? "pointer" : "default" }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} style={styles.cell}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  wrap: {
    overflowX: "auto",
    marginTop: 2,
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  head: {
    textAlign: "left",
    color: BRANDING.colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    padding: "0 14px 14px 0",
    borderBottom: "1px solid #EEE4D8",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  row: {
    transition: "background-color 160ms ease",
  },
  cell: {
    padding: "18px 14px 18px 0",
    color: BRANDING.colors.text,
    fontSize: 14,
    verticalAlign: "middle",
    borderBottom: "1px solid #F5EEE7",
  },
};
