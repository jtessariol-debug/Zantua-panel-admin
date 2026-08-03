import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, Box, ClipboardList } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import InventoryForm from "../components/inventory/InventoryForm";
import InventoryTabs from "../components/inventory/InventoryTabs";
import StockBadge from "../components/inventory/StockBadge";
import StockMovementModal from "../components/inventory/StockMovementModal";
import PatientModal from "../components/patients/PatientModal";
import ActionButton from "../components/ui/ActionButton";
import DashboardCard from "../components/ui/DashboardCard";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import { BRANDING } from "../lib/branding";
import {
  createInventoryItem,
  deactivateProduct,
  fetchInventoryData,
  registerStockMovement,
  updateInventoryItem,
} from "../services/finance";

function formatCurrency(value) {
  return value != null ? `RD$ ${Number(value).toFixed(2)}` : "—";
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-DO");
  } catch {
    return "—";
  }
}

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
    const lowProducts = inventory.products.filter(
      (item) => Number(item.current_stock || 0) <= Number(item.min_stock || 0)
    ).length;
    const lowSupplies = inventory.supplies.filter(
      (item) => Number(item.current_stock || 0) <= Number(item.min_stock || 0)
    ).length;

    return [
      {
        title: "Productos activos",
        value: inventory.products.filter((item) => item.active !== false).length,
        description: "Catálogo visible para venta en cabina o mostrador.",
        icon: Box,
        accent: { background: "#EEF5F1", color: BRANDING.colors.primaryStrong },
      },
      {
        title: "Insumos del centro",
        value: inventory.supplies.length,
        description: "Material operativo listo para seguimiento diario.",
        icon: ClipboardList,
        accent: { background: "#F4EEE6", color: "#9A774A" },
      },
      {
        title: "Stock bajo",
        value: lowProducts + lowSupplies,
        description: "Registros que requieren reposición o revisión.",
        icon: AlertTriangle,
        accent: { background: "#F8E8EA", color: "#A24F5D" },
      },
      {
        title: "Movimientos",
        value: inventory.movements.length,
        description: "Entradas y salidas visibles en el periodo actual.",
        icon: ArrowDownUp,
        accent: { background: "#EEF3F8", color: "#496985" },
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

  const productColumns = [
    {
      key: "name",
      label: "Producto",
      render: (item) => (
        <div>
          <div style={styles.primaryCell}>{item.name}</div>
          <div style={styles.secondaryCell}>{item.description || "Sin descripción"}</div>
        </div>
      ),
    },
    { key: "category", label: "Categoría", render: (item) => item.category || "—" },
    { key: "price", label: "Precio", render: (item) => formatCurrency(item.price) },
    { key: "current_stock", label: "Stock actual", render: (item) => <span style={styles.mono}>{Number(item.current_stock || 0)}</span> },
    { key: "min_stock", label: "Stock mínimo", render: (item) => <span style={styles.mono}>{Number(item.min_stock || 0)}</span> },
    {
      key: "status",
      label: "Estado",
      render: (item) => (
        <StockBadge
          currentStock={item.current_stock}
          minStock={item.min_stock}
          active={item.active !== false}
        />
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (item) => (
        <div style={styles.actions}>
          <ActionButton
            variant="secondary"
            onClick={() => setMovementModal({ itemType: "producto", item, movementType: "entrada" })}
            style={styles.smallButton}
          >
            Entrada
          </ActionButton>
          <ActionButton
            variant="ghost"
            onClick={() => setMovementModal({ itemType: "producto", item, movementType: "salida" })}
            style={styles.smallButton}
          >
            Salida
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => setProductModal({ mode: "edit", item })}
            style={styles.smallButton}
          >
            Editar
          </ActionButton>
          <ActionButton
            variant={item.active === false ? "success" : "danger"}
            onClick={() => handleToggleProduct(item)}
            style={styles.smallButton}
          >
            {item.active === false ? "Activar" : "Desactivar"}
          </ActionButton>
        </div>
      ),
    },
  ];

  const supplyColumns = [
    {
      key: "name",
      label: "Insumo",
      render: (item) => (
        <div>
          <div style={styles.primaryCell}>{item.name}</div>
          <div style={styles.secondaryCell}>{item.description || "Sin descripción"}</div>
        </div>
      ),
    },
    { key: "category", label: "Categoría", render: (item) => item.category || "—" },
    { key: "price", label: "Precio", render: () => "—" },
    { key: "current_stock", label: "Stock actual", render: (item) => <span style={styles.mono}>{Number(item.current_stock || 0)}</span> },
    { key: "min_stock", label: "Stock mínimo", render: (item) => <span style={styles.mono}>{Number(item.min_stock || 0)}</span> },
    {
      key: "status",
      label: "Estado",
      render: (item) => (
        <StockBadge
          currentStock={item.current_stock}
          minStock={item.min_stock}
          active
        />
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (item) => (
        <div style={styles.actions}>
          <ActionButton
            variant="secondary"
            onClick={() => setMovementModal({ itemType: "insumo", item, movementType: "entrada" })}
            style={styles.smallButton}
          >
            Entrada
          </ActionButton>
          <ActionButton
            variant="ghost"
            onClick={() => setMovementModal({ itemType: "insumo", item, movementType: "salida" })}
            style={styles.smallButton}
          >
            Salida
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => setSupplyModal({ mode: "edit", item })}
            style={styles.smallButton}
          >
            Editar
          </ActionButton>
        </div>
      ),
    },
  ];

  const movementColumns = [
    { key: "created_at", label: "Fecha", render: (item) => formatDateTime(item.created_at) },
    { key: "type", label: "Tipo", render: (item) => item.item_type === "producto" ? "Producto" : "Insumo" },
    {
      key: "name",
      label: "Registro",
      render: (item) => (
        <div>
          <div style={styles.primaryCell}>{item.name}</div>
          <div style={styles.secondaryCell}>{item.movement_type}</div>
        </div>
      ),
    },
    { key: "quantity", label: "Cantidad", render: (item) => <span style={styles.mono}>{item.quantity}</span> },
    {
      key: "reason",
      label: "Razón",
      render: (item) => <div style={styles.reasonCell}>{item.reason || "Sin razón registrada"}</div>,
    },
  ];

  const activeTableConfig = {
    products: {
      columns: productColumns,
      rows: inventory.products,
      emptyTitle: "No hay productos registrados todavía.",
      emptyDescription: "Agrega productos de venta para comenzar a gestionar existencias y salidas por facturación.",
      emptyAction: (
        <ActionButton onClick={() => setProductModal({ mode: "create" })}>
          Crear producto
        </ActionButton>
      ),
    },
    supplies: {
      columns: supplyColumns,
      rows: inventory.supplies,
      emptyTitle: "No hay insumos registrados todavía.",
      emptyDescription: "Agrega insumos operativos para llevar control de consumo y reposición.",
      emptyAction: (
        <ActionButton onClick={() => setSupplyModal({ mode: "create" })}>
          Crear insumo
        </ActionButton>
      ),
    },
    movements: {
      columns: movementColumns,
      rows: inventory.movements,
      emptyTitle: "No hay movimientos registrados todavía.",
      emptyDescription: "Las entradas y salidas de stock aparecerán aquí con fecha, cantidad y motivo.",
      emptyAction: null,
    },
  }[activeTab];

  return (
    <AppLayout>
      <div style={styles.page}>
        <PageHeader
          eyebrow="Operación y stock"
          title="Inventario"
          subtitle="Control de productos de venta, insumos del centro y movimientos de stock con alertas visibles y acciones rápidas."
          actions={(
            <div style={styles.headerActions}>
              <ActionButton variant="secondary" onClick={() => setSupplyModal({ mode: "create" })}>
                + Nuevo insumo
              </ActionButton>
              <ActionButton onClick={() => setProductModal({ mode: "create" })}>
                + Nuevo producto
              </ActionButton>
            </div>
          )}
        />

        <div style={styles.metricsGrid}>
          {metrics.map((metric) => <DashboardCard key={metric.title} {...metric} />)}
        </div>

        {feedback ? <div style={styles.successBanner}>{feedback}</div> : null}
        {error ? <div style={styles.errorBanner}>{error}</div> : null}

        <SectionCard
          title="Gestión de inventario"
          subtitle="Supervisa stock actual, alertas, movimientos y catálogos sin salir del mismo módulo."
          action={<InventoryTabs activeTab={activeTab} onChange={setActiveTab} />}
        >
          {loading ? (
            <div style={styles.loadingCopy}>Cargando inventario...</div>
          ) : (
            <DataTable
              columns={activeTableConfig.columns}
              rows={activeTableConfig.rows}
              emptyState={(
                <EmptyState
                  title={activeTableConfig.emptyTitle}
                  description={activeTableConfig.emptyDescription}
                  action={activeTableConfig.emptyAction}
                />
              )}
            />
          )}
        </SectionCard>

        {productModal ? (
          <PatientModal
            title={productModal.mode === "edit" ? "Editar producto" : "Nuevo producto"}
            subtitle="Gestiona productos de venta con control de stock, alertas mínimas y disponibilidad comercial."
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

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  loadingCopy: {
    color: BRANDING.colors.textMuted,
    fontSize: 14,
    padding: "6px 0",
  },
  successBanner: {
    background: BRANDING.colors.successSoft,
    border: "1px solid #CFE8D8",
    color: "#28704B",
    borderRadius: 18,
    padding: "14px 16px",
    fontSize: 14,
    fontWeight: 600,
  },
  errorBanner: {
    background: "rgba(209, 109, 120, 0.1)",
    border: "1px solid rgba(209, 109, 120, 0.28)",
    color: "#A44E60",
    borderRadius: 18,
    padding: "14px 16px",
    fontSize: 14,
    fontWeight: 600,
  },
  primaryCell: {
    fontWeight: 700,
    color: BRANDING.colors.primaryStrong,
  },
  secondaryCell: {
    fontSize: 12,
    color: BRANDING.colors.textMuted,
    marginTop: 4,
    lineHeight: 1.5,
  },
  mono: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 700,
  },
  reasonCell: {
    minWidth: 220,
    lineHeight: 1.6,
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  smallButton: {
    padding: "10px 12px",
    borderRadius: 14,
  },
};
