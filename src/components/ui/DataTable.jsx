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
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  head: {
    textAlign: "left",
    color: "#8A7B72",
    fontSize: 12,
    textTransform: "uppercase",
    padding: "0 0 14px",
    borderBottom: "1px solid #F0E8E1",
    fontWeight: 700,
  },
  row: {
    borderBottom: "1px solid #F5EFE9",
  },
  cell: {
    padding: "16px 0",
    color: "#2A2522",
    fontSize: 14,
    verticalAlign: "middle",
  },
};
