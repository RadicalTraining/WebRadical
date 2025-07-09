import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

// =================== REGISTRAR / ACTUALIZAR ===================
document.getElementById("registro").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const plan = parseInt(document.getElementById("plan").value);
    const valorPagado = parseInt(document.getElementById("valorPagado").value);
    const fechaIngresoInput = document.getElementById("fechaIngreso").value;

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
        document.getElementById("btnEliminar").style.display = "none";

        verificarVencimientos();

    } catch (error) {
        console.error("Error al guardar:", error);
        document.getElementById("resultado").innerText = "❌ Error al guardar los datos.";
    }
});

// =================== ELIMINAR CLIENTE ===================
// document.getElementById("btnEliminar").addEventListener("click", async () => {
//     const telefono = document.getElementById("telefono").value.trim();
//     const nombre = document.getElementById("nombre").value.trim();

//     if (!telefono) {
//         alert("Busca un cliente para poder eliminarlo.");
//         return;
//     }

//     const confirmar = confirm(`¿Estás seguro de que quieres eliminar a ${nombre} (${telefono})? Esta acción no se puede deshacer.`);
//     if (!confirmar) return;

//     try {
//         await deleteDoc(doc(db, "clientes", telefono));
//         console.log(`✅ Cliente ${telefono} eliminado de Firestore.`);
//         document.getElementById("resultado").innerText = `✅ Cliente ${nombre} eliminado correctamente.`;
//         document.getElementById("registro").reset();
//         document.getElementById("telefonoBusqueda").value = "";
//         document.getElementById("btnEliminar").style.display = "none";
//         verificarVencimientos();
//     } catch (error) {
//         console.error("Error al eliminar:", error);
//         document.getElementById("resultado").innerText = "❌ Error al eliminar el cliente.";
//     }
// });

// // Ocultar botón de eliminar al inicio
// document.getElementById("btnEliminar").style.display = "none";

// =================== BUSCAR POR TELÉFONO ===================
window.buscarCliente = async function () {
    const telefono = document.getElementById("telefonoBusqueda").value.trim();
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

        document.getElementById("btnEliminar").style.display = "inline-block";
    } else {
        document.getElementById("resultado").innerText = "⚠️ Cliente no encontrado.";
        document.getElementById("registro").reset();
        document.getElementById("btnEliminar").style.display = "none";
    }
};

// =================== BUSCAR POR NOMBRE ===================
window.buscarClientePorApellido = async function () {
    const texto = document.getElementById("apellidoBusqueda").value.trim().toLowerCase();
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
                document.getElementById("btnEliminar").style.display = "inline-block";
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
}

// =================== ALERTA DE VENCIMIENTOS ===================
async function verificarVencimientos() {
    const container = document.getElementById("vencenManana");
    container.innerHTML = "";

    const snapshot = await getDocs(collection(db, "clientes"));

    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const fechaObjetivo = mañana.toISOString().split("T")[0];
    console.log("📆 Fecha objetivo (mañana):", fechaObjetivo);

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

// =================== REPORTE EXCEL ===================
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
        const data = [["Nombre", "Teléfono", "Tipo de Plan", "Valor Pagado", "Fecha de Ingreso", "Fecha de Vencimiento"]];
        snapshot.forEach(docu => {
            const c = docu.data();
            const ingreso = new Date(c.fechaIngreso);
            if (ingreso >= inicio && ingreso <= fin) {
                data.push([
                    c.nombre || "",
                    c.telefono || "",
                    c.tipoPlan === 1 ? "Semanal" :
                        c.tipoPlan === 2 ? "Quincena" :
                            c.tipoPlan === 3 ? "Mensual" :
                                c.tipoPlan === 4 ? "Bimestral" : "Otro",
                    c.valorPago || 0,
                    c.fechaIngreso || "",
                    c.fechaVencimiento || ""
                ]);
            }
        });

        if (data.length <= 1) {
            mensaje.innerText = "No hay datos en ese rango.";
            mensaje.style.color = "red";
            return;
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ReportePagos");
        XLSX.writeFile(wb, `Reporte_${inicioStr}_a_${finStr}.xlsx`);

        mensaje.innerText = "✅ Reporte generado.";
        mensaje.style.color = "green";

    } catch (err) {
        console.error(err);
        mensaje.innerText = "❌ Error al generar reporte.";
        mensaje.style.color = "red";
    }
};
