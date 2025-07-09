import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
// import ExcelJS from "https://cdn.jsdelivr.net/npm/exceljs/dist/exceljs.min.js";

// =================== REGISTRAR / ACTUALIZAR ===================
document.getElementById("registro").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const telefono = document.getElementById("telefono").value;
    const plan = parseInt(document.getElementById("plan").value);
    const valorPagado = parseInt(document.getElementById("valorPagado").value);
    const fechaIngresoInput = document.getElementById("fechaIngreso").value;
    const metodoPago = parseInt(document.getElementById("metodoPago").value); // AHORA NÚMERO

    if (!fechaIngresoInput) {
        document.getElementById("resultado").innerText = "❌ Fecha de ingreso no válida.";
        return;
    }

    const fechaIngreso = new Date(fechaIngresoInput);

    let diasAAgregar = 0;
    switch (plan) {
        case 1: diasAAgregar = 7; break;
        case 2: diasAAgregar = 15; break;
        case 3: diasAAgregar = 30; break;
        case 4: diasAAgregar = 60; break;
        case 5: diasAAgregar = 90; break;
        default: diasAAgregar = 30; break;
    }

    const fechaVencimiento = new Date(fechaIngreso);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + diasAAgregar);

    const fechaIngresoStr = fechaIngreso.toISOString().split("T")[0];
    const fechaVencimientoStr = fechaVencimiento.toISOString().split("T")[0];

    try {
        await setDoc(doc(db, "clientes", telefono), {
            nombre,
            telefono,
            metodoPago: metodoPago, // Ya guardado como número
            tipoPlan: plan,
            valorPago: valorPagado,
            fechaIngreso: fechaIngresoStr,
            fechaVencimiento: fechaVencimientoStr
        });

        const hoy = new Date();
        const estado = hoy <= fechaVencimiento
            ? "<span class='estado-activo'>Activo</span>"
            : "<span class='estado-vencido'>Vencido</span>";

        document.getElementById("resultado").innerHTML =
            `✅ Cliente <strong>${nombre}</strong> guardado. Vence el <strong>${fechaVencimientoStr}</strong>. Estado: ${estado}`;

        document.getElementById("registro").reset();
        document.getElementById("telefonoBusqueda").value = "";
        verificarVencimientos();

    } catch (error) {
        console.error("Error al guardar:", error);
        document.getElementById("resultado").innerText = "❌ Error al guardar los datos.";
    }
});

// =================== BUSCAR POR TELÉFONO ===================
window.buscarCliente = async function () {
    const telefono = document.getElementById("telefonoBusqueda").value;
    if (!telefono) return alert("Ingresa un número de teléfono.");

    const ref = doc(db, "clientes", telefono);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const data = snap.data();
        llenarFormulario(data);
        const hoy = new Date();
        const vencimiento = new Date(data.fechaVencimiento);
        const estado = hoy <= vencimiento
            ? "<span class='estado-activo'>Activo</span>"
            : "<span class='estado-vencido'>Vencido</span>";
        document.getElementById("resultado").innerHTML =
            `✅ Cliente encontrado. Estado de la membresía: ${estado}`;
    } else {
        document.getElementById("resultado").innerText = "⚠️ Cliente no encontrado.";
        document.getElementById("registro").reset();
    }
};

// =================== BUSCAR POR NOMBRE ===================
window.buscarClientePorApellido = async function () {
    const texto = document.getElementById("apellidoBusqueda").value.toLowerCase();
    const container = document.getElementById("resultadosBusquedaApellido");
    if (!texto) return alert("Ingresa un nombre para buscar.");

    const snapshot = await getDocs(collection(db, "clientes"));
    let html = "";
    snapshot.forEach(docu => {
        const c = docu.data();
        if (c.nombre.toLowerCase().includes(texto)) {
            html += `<li style="cursor:pointer" data-telefono="${c.telefono}">
                <strong>${c.nombre}</strong> - ${c.telefono} - Vence: ${c.fechaVencimiento}</li>`;
        }
    });
    container.innerHTML = html || "<p>No se encontraron coincidencias.</p>";

    container.querySelectorAll("li").forEach(item => {
        item.addEventListener("click", async () => {
            const tel = item.getAttribute("data-telefono");
            const snap = await getDoc(doc(db, "clientes", tel));
            if (snap.exists()) {
                const c = snap.data();
                llenarFormulario(c);
                document.getElementById("resultado").innerHTML = `✅ Cliente seleccionado: <strong>${c.nombre}</strong>`;
                document.getElementById("telefonoBusqueda").value = tel;
            }
        });
    });
};

// =================== RELLENAR FORMULARIO ===================
function llenarFormulario(c) {
    document.getElementById("nombre").value = c.nombre || "";
    document.getElementById("telefono").value = c.telefono || "";
    document.getElementById("plan").value = c.tipoPlan || "1";
    document.getElementById("fechaIngreso").value = c.fechaIngreso || "";
    document.getElementById("valorPagado").value = c.valorPago || "";
    document.getElementById("metodoPago").value = c.metodoPago || "1";
}

// =================== ALERTA DE VENCIMIENTOS ===================
async function verificarVencimientos() {
    const container = document.getElementById("vencenManana");
    container.innerHTML = "";

    const snapshot = await getDocs(collection(db, "clientes"));

    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const fechaObjetivo = mañana.toISOString().split("T")[0];

    let found = false;
    snapshot.forEach(docu => {
        const c = docu.data();
        const fechaCliente = new Date(c.fechaVencimiento).toISOString().split("T")[0];
        if (fechaCliente === fechaObjetivo) {
            found = true;
            const mensaje = encodeURIComponent(`Hola ${c.nombre}, tu membresía en Radical Training vence el ${c.fechaVencimiento}. ¡Te esperamos para seguir entrenando!`);
            const link = `https://wa.me/57${c.telefono}?text=${mensaje}`;

            container.innerHTML += `
                <div class="vencimiento-card">
                    <p>
                        <strong>${c.nombre}</strong> (${c.telefono}) vence el <strong>${c.fechaVencimiento}</strong>
                        <a href="${link}" target="_blank" class="whatsapp-inline-icon" title="Enviar WhatsApp">
                            <i class="fa-brands fa-whatsapp fa-lg"></i>
                        </a>
                    </p>
                </div>`;
        }
    });

    if (!found) {
        container.innerHTML = "<p>No hay clientes que venzan mañana.</p>";
    }
}

verificarVencimientos();

// =================== REPORTE EXCEL CON TABLA REAL ===================
window.generarReporteExcel = async function () {
    const inicioStr = document.getElementById("fechaInicioReporte").value;
    const finStr = document.getElementById("fechaFinReporte").value;
    const mensaje = document.getElementById("mensajeReporte");

    if (!inicioStr || !finStr) {
        mensaje.innerText = "Selecciona un rango de fechas.";
        mensaje.style.color = "orange";
        return;
    }

    const inicio = new Date(inicioStr);
    const fin = new Date(finStr); fin.setHours(23, 59, 59, 999);

    mensaje.innerText = "Generando reporte...";
    mensaje.style.color = "black";

    try {
        const snapshot = await getDocs(collection(db, "clientes"));
        const rows = [];

        snapshot.forEach(docu => {
            const c = docu.data();
            const ingreso = new Date(c.fechaIngreso);
            if (ingreso >= inicio && ingreso <= fin) {
                rows.push([
                    c.nombre || "",
                    c.telefono || "",
                    c.tipoPlan === 1 ? "Semanal" :
                        c.tipoPlan === 2 ? "Quincena" :
                            c.tipoPlan === 3 ? "Mensual" :
                                c.tipoPlan === 4 ? "Bimestral" :
                                    c.tipoPlan === 5 ? "Trimestral" : "Otro",
                    c.valorPago || 0,
                    c.fechaIngreso || "",
                    c.metodoPago === 1 ? "Efectivo" :
                        c.metodoPago === 2 ? "Transferencia" : "Otro",
                    c.fechaVencimiento || ""
                ]);
            }
        });

        if (rows.length === 0) {
            mensaje.innerText = "No hay datos en ese rango.";
            mensaje.style.color = "red";
            return;
        }

        const workbook = new window.ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("ReportePagos");

        worksheet.columns = [
            { header: "Nombre", key: "nombre" },
            { header: "Teléfono", key: "telefono" },
            { header: "Tipo de Plan", key: "tipoPlan" },
            { header: "Valor Pagado", key: "valorPagado" },
            { header: "Fecha de Ingreso", key: "fechaIngreso" },
            { header: "Método de Pago", key: "metodoPago" },
            { header: "Fecha de Vencimiento", key: "fechaVencimiento" }
        ];

        worksheet.addRows(rows);

        worksheet.addTable({
            name: "TablaPagos",
            ref: "A1",
            headerRow: true,
            totalsRow: false,
            columns: worksheet.columns.map(col => ({ name: col.header })),
            rows: rows
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Reporte_${inicioStr}_a_${finStr}.xlsx`;
        link.click();

        mensaje.innerText = "✅ Reporte generado.";
        mensaje.style.color = "green";

    } catch (err) {
        console.error(err);
        mensaje.innerText = "❌ Error al generar reporte.";
        mensaje.style.color = "red";
    }
};
