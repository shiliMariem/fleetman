const API = "/api";

let vehicles = [];
let map = null;
let markers = [];
let routeLine = null;
let refreshTimer = null;

const $ = (id) => document.getElementById(id);

function updateTime() {
    const element = $("lastUpdate");
    if (element) {
        element.textContent = new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }
}

function setConnectionStatus(connected, message) {
    const status = $("connectionStatus");
    const tracker = $("trackerStatus");

    if (status) {
        status.textContent = connected
            ? "● Backend connecté"
            : "● Backend indisponible";

        status.style.background = connected ? "#dcfce7" : "#ffedd5";
        status.style.color = connected ? "#166534" : "#9a3412";
    }

    if (tracker) {
        tracker.textContent = message;
        tracker.className = connected
            ? "stat-value green"
            : "stat-value orange";
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function loadLeaflet() {
    return new Promise((resolve, reject) => {
        if (window.L) {
            resolve();
            return;
        }

        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Leaflet indisponible"));
        document.head.appendChild(script);
    });
}

function prepareMap() {
    const container = $("fleetMap");

    if (!container || !window.L) {
        throw new Error("Conteneur de carte ou Leaflet introuvable");
    }

    map = L.map("fleetMap").setView([53.3811, -1.4701], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
    }).addTo(map);
}

function drawVehicles() {
    if (!map) return;

    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const points = [];

    vehicles.forEach(vehicle => {
        const lat = Number(vehicle.lat);
        const lng = Number(vehicle.longitude ?? vehicle.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const point = [lat, lng];
        points.push(point);

        const truckIcon = L.divIcon({
            className: "",
            html: '<div style="background:#2563eb;color:white;border:2px solid white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px #64748b;">🚚</div>',
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });

        const marker = L.marker(point, { icon: truckIcon }).addTo(map);

        marker.bindPopup(`
            <strong>${escapeHTML(vehicle.name)}</strong><br>
            Latitude : ${lat.toFixed(6)}<br>
            Longitude : ${lng.toFixed(6)}<br>
            Vitesse : ${Number(vehicle.speed || 0).toFixed(2)}<br>
            Dernière position : ${escapeHTML(vehicle.timestamp || "Indisponible")}
        `);

        markers.push(marker);
    });

    if (points.length && !routeLine) {
        map.fitBounds(points, {
            padding: [30, 30],
            maxZoom: 13
        });
    }
}

function renderVehicles() {
    $("totalVehicles").textContent = vehicles.length;

    $("positionCount").textContent = vehicles.filter(vehicle =>
        Number.isFinite(Number(vehicle.lat)) &&
        Number.isFinite(Number(vehicle.longitude ?? vehicle.lng))
    ).length;

    const table = $("vehicleTable");

    if (!vehicles.length) {
        table.innerHTML =
            '<tr><td colspan="5" class="empty-message">Aucun véhicule disponible.</td></tr>';

        if (map) drawVehicles();
        return;
    }

    table.innerHTML = vehicles.map(vehicle => {
        const lat = Number(vehicle.lat);
        const lng = Number(vehicle.longitude ?? vehicle.lng);
        const speed = Number(vehicle.speed);

        return `
            <tr>
                <td class="vehicle-name">${escapeHTML(vehicle.name)}</td>
                <td>${Number.isFinite(lat) ? lat.toFixed(6) : "—"}</td>
                <td>${Number.isFinite(lng) ? lng.toFixed(6) : "—"}</td>
                <td>${Number.isFinite(speed) ? speed.toFixed(2) : "—"}</td>
                <td><span class="badge">Données reçues</span></td>
            </tr>
        `;
    }).join("");

    if (map) drawVehicles();
}

async function loadVehicles() {
    try {
        const response = await fetch(`${API}/vehicles/`, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Format de données inattendu");
        }

        vehicles = data;
        renderVehicles();
        setConnectionStatus(true, "Connecté");
    } catch (error) {
        console.error("Erreur de récupération des véhicules :", error);
        setConnectionStatus(false, "Indisponible");
    } finally {
        updateTime();
    }
}

async function showHistory() {
    if (!vehicles.length) {
        alert("Aucun véhicule disponible. Actualise d'abord les données.");
        return;
    }

    const names = vehicles.map(vehicle => vehicle.name);
    const chosen = prompt(
        "Saisis le nom exact du véhicule :\n\n" +
        names.slice(0, 15).join("\n")
    );

    if (!chosen) return;

    const vehicle = vehicles.find(item =>
        item.name === chosen.trim()
    );

    if (!vehicle) {
        alert("Véhicule introuvable. Vérifie le nom saisi.");
        return;
    }

    try {
        const response = await fetch(
            `${API}/history/${encodeURIComponent(vehicle.name)}`,
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const history = await response.json();

        if (!Array.isArray(history) || history.length === 0) {
            alert("Aucun historique disponible pour ce véhicule.");
            return;
        }

        const points = history
            .map(point => [
                Number(point.lat),
                Number(point.lng ?? point.longitude)
            ])
            .filter(point => point.every(Number.isFinite));

        if (!points.length) {
            alert("Aucune coordonnée valide dans cet historique.");
            return;
        }

        if (routeLine) {
            map.removeLayer(routeLine);
        }

        routeLine = L.polyline(points, {
            color: "#7c3aed",
            weight: 5
        }).addTo(map);

        map.fitBounds(routeLine.getBounds(), {
            padding: [35, 35]
        });

        $("mapSection").scrollIntoView({ behavior: "smooth" });

        alert(
            `Trajet affiché pour ${vehicle.name} : ` +
            `${points.length} positions.`
        );
    } catch (error) {
        console.error("Erreur de chargement de l'historique :", error);
        alert("Impossible de charger l'historique depuis le backend.");
    }
}

function setupNavigation() {
    const items = document.querySelectorAll(".menu-item");

    items.forEach(item => {
        item.addEventListener("click", () => {
            items.forEach(entry => entry.classList.remove("active"));
            item.classList.add("active");

            const page = item.dataset.page;

            $("settingsSection").hidden = page !== "settings";
            $("dashboardStats").hidden = page === "settings";

            $("pageTitle").textContent = {
                dashboard: "Tableau de bord",
                vehicles: "Véhicules de la flotte",
                map: "Suivi GPS",
                history: "Historique des trajets",
                settings: "Paramètres"
            }[page] || "Fleetman";

            if (page === "dashboard") {
                $("mapSection").hidden = false;
                $("vehiclesSection").hidden = false;
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else if (page === "vehicles") {
                $("mapSection").hidden = true;
                $("vehiclesSection").hidden = false;
                $("vehiclesSection").scrollIntoView({ behavior: "smooth" });
            } else if (page === "map") {
                $("mapSection").hidden = false;
                $("vehiclesSection").hidden = true;
                $("mapSection").scrollIntoView({ behavior: "smooth" });

                setTimeout(() => {
                    if (map) map.invalidateSize();
                }, 250);
            } else if (page === "history") {
                $("mapSection").hidden = false;
                $("vehiclesSection").hidden = false;
                $("mapSection").scrollIntoView({ behavior: "smooth" });
                showHistory();
            } else if (page === "settings") {
                $("mapSection").hidden = true;
                $("vehiclesSection").hidden = true;
                $("settingsSection").scrollIntoView({ behavior: "smooth" });
            }
        });
    });
}

async function startDashboard() {
    setupNavigation();

    $("refreshButton").addEventListener("click", loadVehicles);

    $("vehiclesButton").addEventListener("click", () => {
        $("vehiclesSection").scrollIntoView({ behavior: "smooth" });
    });

    try {
        await loadLeaflet();
        prepareMap();
        await loadVehicles();

        refreshTimer = setInterval(loadVehicles, 10000);
    } catch (error) {
        console.error("Erreur d'initialisation de la carte :", error);

        $("fleetMap").innerHTML =
            '<p style="padding:24px;color:#748096">Carte indisponible. Vérifie ta connexion Internet.</p>';

        await loadVehicles();
        refreshTimer = setInterval(loadVehicles, 10000);
    }
}

window.addEventListener("beforeunload", () => {
    if (refreshTimer) clearInterval(refreshTimer);
});

startDashboard();
