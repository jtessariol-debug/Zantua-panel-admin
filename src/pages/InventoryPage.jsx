import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, Box, ClipboardList } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import DashboardCard from "../components/ui/DashboardCard";
import EmptyState from "../components/ui/EmptyState";
import SectionCard from "../components/ui/SectionCard";
import PatientModal from "../components/patients/PatientModal";
import InventoryTabs from "../components/inventory/InventoryTabs";
import InventoryForm from "../components/inventory/InventoryForm";
import StockBadge from "../components/inventory/StockBadge";
import StockMovementModal from "../components/inventory/StockMovementModal";
import {
  createInventoryItem,
  deactivateProduct,
  fetchInventoryData,
  registerStockMovement,
  updateInventoryItem,
} from "../services/finance";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("products");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState({ products: [], supplies: [], movements: [] });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [productModal, setProductModal] = useState(null);
  const [supplyModal, setSupplyModal] = useState(null);
  const [movementModal, setMovementModal] = useState(null);

  async function loadInventory() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchInventoryData();
      setInventory(result);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "No fue posible cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const metrics = useMemo(() => {
    const lowProducts = inventory.products.filter((item) => Number(item.current_stock || 0) <= Number(item.min_stock || 0)).length;
    const lowSupplies = inventory.supplies.filter((item) => Number(item.current_stock || 0) <= Number(item.min_stock || 0)).length;
    return [
      {
        title: "Productos activos",
        value: inventory.products.filter((item) => item.active !== false).length,
        description: "Catálogo disponible para venta en cabina o mostrador.",
        icon: Box,
        accent: { background: "#FCEEE5", color: "#B76A4D" },
      },
      {
        title: "Insumos del centro",
        value: inventory.supplies.length,
        description: "Material operativo listo para seguimiento diario.",
        icon: ClipboardList,
        accent: { background: "#F3EAF8", color: "#915AA6" },
      },
      {
        title: "Stock bajo",
        value: lowProducts + lowSupplies,
        description: "Productos e insumos que requieren reposición.",
        icon: AlertTriangle,
        accent: { background: "#FDEBEC", color: "#B54B57" },
      },
      {
        title: "Movimientos recientes",
        value: inventory.movements.length,
        description: "Entradas y salidas registradas en el periodo visible.",
        icon: ArrowDownUp,
        accent: { background: "#EAF6ED", color: "#28704B" },
      },
    ];
  }, [inventory]);

  async function handleProductSubmit(payload, currentItem) {
    setSaving(true);
    setError("");
    try {
      if (currentItem) {
        await updateInventoryItem("products", currentItem.id, payload);
        setFeedback("Producto actualizado correctamente.");
      } else {
        await createInventoryItem("products", payload);
        setFeedback("Producto creado correctamente.");
      }
      setProductModal(null);
      await loadInventory();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSupplySubmit(payload, currentItem) {
    const sanitizedPayload = {
      name: payload.name,
      description: payload.description,
      category: payload.category,
      current_stock: payload.current_stock,
      min_stock: payload.min_stock,
    };
    setSaving(true);
    setError("");
    try {
      if (currentItem) {
        await updateInventoryItem("supplies", currentItem.id, sanitizedPayload);
        setFeedback("Insumo actualizado correctamente.");
      } else {
        await createInventoryItem("supplies", sanitizedPayload);
        setFeedback("Insumo creado correctamente.");
      }
      setSupplyModal(null);
      await loadInventory();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible guardar el insumo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMovementSubmit(values) {
    if (!movementModal) return;
    setSaving(true);
    setError("");
    try {
      await registerStockMovement({
        itemType: movementModal.itemType,
        itemId: movementModal.item.id,
        movementType: movementModal.movementType,
        quantity: values.quantity,
        reason: values.reason,
      });
      setFeedback("Movimiento de stock registrado correctamente.");
      setMovementModal(null);
      await loadInventory();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible registrar el movimiento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleProduct(product) {
    setSaving(true);
    setError("");
    try {
      await deactivateProduct(product.id, product.active === false);
      setFeedback(product.active === false ? "Producto reactivado." : "Producto desactivado.");
      await loadInventory();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "No fue posible actualizar el estado del producto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Inventario</h1>
            <p style={styles.subtitle}>Control de productos de venta, consumibles del centro y movimientos de stock.</p>
          </div>
          <div style={styles.headerActions}>
            <button type="button" onClick={() => setSupplyModal({ mode: "create" })} style={styles.secondaryButton}>
              + Nuevo insumo
            </button>
            <button type="button" onClick={() => setProductModal({ mode: "create" })} style={styles.primaryButton}>
              + Nuevo producto
            </button>
          </div>
        </div>

        <div style={styles.metricsGrid}>
          {metrics.map((metric) => <DashboardCard key={metric.title} {...metric} />)}
        </div>

        {feedback ? <div style={styles.successBanner}>{feedback}</div> : null}
        {error ? <div style={styles.errorBanner}>{error}</div> : null}

        <SectionCard
          title="Gestión de inventario"
          subtitle="Supervisa stock actual, alertas y movimientos desde un mismo lugar."
          action={<InventoryTabs activeTab={activeTab} onChange={setActiveTab} />}
        >
          {loading ? (
            <div style={styles.loadingCopy}>Cargando inventario...</div>
          ) : (
            <>
              {activeTab === "products" ? (
                <InventoryTable
                  title="Productos de venta"
                  rows={inventory.products}
                  emptyTitle="No hay productos registrados todavía."
                  emptyDescription="Agrega productos de venta para comenzar a gestionar existencias y salidas por facturación."
                  onCreate={() => setProductModal({ mode: "create" })}
                  renderActions={(item) => (
                    <div style={styles.actionGroup}>
                      <button type="button" onClick={() => setMovementModal({ itemType: "producto", item, movementType: "entrada" })} style={styles.actionButton}>Entrada</button>
                      <button type="button" onClick={() => setMovementModal({ itemType: "producto", item, movementType: "salida" })} style={styles.actionButton}>Salida</button>
                      <button type="button" onClick={() => setProductModal({ mode: "edit", item })} style={styles.actionButtonPrimary}>Editar</button>
                      <button type="button" onClick={() => handleToggleProduct(item)} style={styles.cancelButton}>
                        {item.active === false ? "Activar" : "Desactivar"}
                      </button>
                    </div>
                  )}
                />
              ) : null}

              {activeTab === "supplies" ? (
                <InventoryTable
                  title="Insumos del centro"
                  rows={inventory.supplies}
                  emptyTitle="No hay insumos registrados todavía."
                  emptyDescription="Agrega los insumos operativos para llevar control de consumo y reposición."
                  onCreate={() => setSupplyModal({ mode: "create" })}
                  renderActions={(item) => (
                    <div style={styles.actionGroup}>
                      <button type="button" onClick={() => setMovementModal({ itemType: "insumo", item, movementType: "entrada" })} style={styles.actionButton}>Entrada</button>
                      <button type="button" onClick={() => setMovementModal({ itemType: "insumo", item, movementType: "salida" })} style={styles.actionButton}>Salida</button>
                      <button type="button" onClick={() => setSupplyModal({ mode: "edit", item })} style={styles.actionButtonPrimary}>Editar</button>
                    </div>
                  )}
                />
              ) : null}

              {activeTab === "movements" ? (
                <MovementsTable rows={inventory.movements} />
              ) : null}
            </>
          )}
        </SectionCard>

        {productModal ? (
          <PatientModal
            title={productModal.mode === "edit" ? "Editar producto" : "Nuevo producto"}
            subtitle="Gestiona productos de venta con control de stock y alertas mínimas."
            onClose={() => setProductModal(null)}
          >
            <InventoryForm
              itemType="product"
              initialValues={productModal.item}
              onSubmit={(payload) => handleProductSubmit(payload, productModal.item)}
              onCancel={() => setProductModal(null)}
              loading={saving}
              submitLabel={productModal.mode === "edit" ? "Guardar cambios" : "Crear producto"}
            />
          </PatientModal>
        ) : null}

        {supplyModal ? (
          <PatientModal
            title={supplyModal.mode === "edit" ? "Editar insumo" : "Nuevo insumo"}
            subtitle="Controla materiales operativos y consumibles de cabina."
            onClose={() => setSupplyModal(null)}
          >
            <InventoryForm
              itemType="supply"
              initialValues={supplyModal.item}
              onSubmit={(payload) => handleSupplySubmit(payload, supplyModal.item)}
              onCancel={() => setSupplyModal(null)}
              loading={saving}
              submitLabel={supplyModal.mode === "edit" ? "Guardar cambios" : "Crear insumo"}
            />
          </PatientModal>
        ) : null}

        {movementModal ? (
          <StockMovementModal
            itemName={movementModal.item.name}
            movementType={movementModal.movementType}
            onClose={() => setMovementModal(null)}
            onSubmit={handleMovementSubmit}
            loading={saving}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}

function InventoryTable({ title, rows, emptyTitle, emptyDescription, onCreate, renderActions }) {
  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={(
          <button type="button" onClick={onCreate} style={styles.primaryButton}>
            Crear registro
          </button>
        )}
      />
    );
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.head}>{title.includes("Insumos") ? "Insumo" : "Producto"}</th>
            <th style={styles.head}>Categoría</th>
            <th style={styles.head}>Precio</th>
            <th style={styles.head}>Stock actual</th>
            <th style={styles.head}>Stock mínimo</th>
            <th style={styles.head}>Estado</th>
            <th style={styles.head}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} style={styles.row}>
              <td style={styles.cell}>
                <div style={styles.primaryCell}>{item.name}</div>
                <div style={styles.secondaryCell}>{item.description || "Sin descripción"}</div>
              </td>
              <td style={styles.cell}>{item.category || "—"}</td>
              <td style={styles.cell}>{item.price != null ? `$${Number(item.price).toFixed(2)}` : "—"}</td>
              <td style={styles.cell}>{Number(item.current_stock || 0)}</td>
              <td style={styles.cell}>{Number(item.min_stock || 0)}</td>
              <td style={styles.cell}><StockBadge currentStock={item.current_stock} minStock={item.min_stock} active={item.active !== false} /></td>
              <td style={styles.cell}>{renderActions(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MovementsTable({ rows }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No hay movimientos registrados todavía."
        description="Las entradas y salidas de stock aparecerán aquí con fecha, cantidad y motivo."
      />
    );
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.head}>Fecha</th>
            <th style={styles.head}>Tipo</th>
            <th style={styles.head}>Producto / Insumo</th>
            <th style={styles.head}>Cantidad</th>
            <th style={styles.head}>Razón</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((movement) => (
            <tr key={`${movement.item_type}-${movement.id}`} style={styles.row}>
              <td style={styles.cell}>{formatDateTime(movement.created_at)}</td>
              <td style={styles.cell}>{capitalize(movement.movement_type)}</td>
              <td style={styles.cell}>{movement.item_name}</td>
              <td style={styles.cell}>{Number(movement.quantity || 0)}</td>
              <td style={styles.cell}>{movement.reason || "Sin detalle"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 24 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" },
  title: { color: "#241F1D", fontSize: 34, fontWeight: 700, margin: 0 },
  subtitle: { color: "#8B7E74", fontSize: 15, lineHeight: 1.6, margin: "8px 0 0" },
  headerActions: { display: "flex", gap: 12, flexWrap: "wrap" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  successBanner: { background: "#EAF6ED", border: "1px solid #CFE8D8", color: "#28704B", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  errorBanner: { background: "rgba(209, 109, 120, 0.1)", border: "1px solid rgba(209, 109, 120, 0.28)", color: "#A44E60", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 600 },
  loadingCopy: { color: "#8A7B72", fontSize: 14, padding: "6px 0" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 920 },
  head: { textAlign: "left", color: "#8A7B72", fontSize: 12, textTransform: "uppercase", padding: "0 0 14px", borderBottom: "1px solid #F0E8E1", fontWeight: 700 },
  row: { borderBottom: "1px solid #F5EFE9" },
  cell: { padding: "16px 0", color: "#2A2522", fontSize: 14, verticalAlign: "middle" },
  primaryCell: { fontWeight: 700, color: "#2A2522" },
  secondaryCell: { fontSize: 12, color: "#8B7E74", marginTop: 4 },
  actionGroup: { display: "flex", gap: 8, flexWrap: "wrap" },
  primaryButton: { background: "linear-gradient(135deg, #C38A63, #A85A66)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  secondaryButton: { background: "#FFFFFF", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 16, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  actionButton: { background: "#fff", color: "#6E564A", border: "1px solid #E6D8CC", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  actionButtonPrimary: { background: "#F7ECE6", color: "#A15A58", border: "1px solid #EBCFC6", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  cancelButton: { background: "#FFF4F5", color: "#A24F5D", border: "1px solid #F3D6DB", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
};
