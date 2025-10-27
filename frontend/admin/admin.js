// admin.js - Panel de Administración (Versión de prueba)

class AdminPanel {
    constructor() {
        this.currentUser = {};
        this.users = [];
        this.promotions = [];
        this.activity = [];

        this.API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://127.0.0.1:3000'
            : 'https://tiendaonlinepdv-hm20.onrender.com';

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCharts();
        this.loadCurrentUser();
    }

    /**
     * Carga los datos del usuario desde localStorage y valida la sesión.
     */
    loadCurrentUser() {
        // --- CORREGIDO: Nombres correctos de localStorage ---
        const token = localStorage.getItem('supabase-token');
        const email = localStorage.getItem('user-email');
        const role = localStorage.getItem('user-role');

        if (!token || !email || !role) {
            alert('Sesión no válida o expirada. Redirigiendo al login.');
            this.logout(true);
            return;
        }

        if (role !== 'Admin') {
            alert('Acceso denegado. No tienes permisos de administrador.');
            this.logout(true);
            return;
        }

        this.currentUser = { email, role };
        this.updateUserInfo();
        this.loadInitialData();
    }

    setupEventListeners() {
        // ... (tus otros listeners de tabs y logout) ...
        document.querySelectorAll('.sidebar-menu a[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

        document.querySelectorAll('[data-report-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const reportTab = e.target.getAttribute('data-report-tab');
                this.switchReportTab(reportTab);
            });
        });
        
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Formularios
        document.getElementById('addUserForm').addEventListener('submit', (e) => this.handleAddUser(e));
        document.getElementById('editUserForm').addEventListener('submit', (e) => this.handleEditUser(e));
        document.getElementById('addPromotionForm').addEventListener('submit', (e) => this.handleAddPromotion(e));

    
        const ruleTypeSelect = document.getElementById('promotionRuleType');
        const ruleValueGroup = document.getElementById('promotionRuleValueGroup');
        const ruleValueInput = document.getElementById('promotionRuleValue');

        if (ruleTypeSelect) { // Asegurarse de que los elementos existan
            const toggleRuleValueField = () => {
                if (!ruleTypeSelect.value) return; // Evitar error si no está seleccionado
                if (ruleTypeSelect.value === 'GLOBAL' || ruleTypeSelect.value === 'REBAJAS' || ruleTypeSelect.value === 'FECHA ESPECIAL') {
                    ruleValueGroup.style.display = 'none';
                    ruleValueInput.required = false;
                    ruleValueInput.value = '';
                } else {
                    ruleValueGroup.style.display = 'block';
                    ruleValueInput.required = true;
                }
            };
            ruleTypeSelect.addEventListener('change', toggleRuleValueField);
            toggleRuleValueField();
        }
    }

    loadInitialData() {
        
        this.updateDashboardStats({
            totalSales: 0, totalUsers: 0, totalProducts: 0, activePromotions: 0,
            monthlyRevenue: 0, totalOrders: 0, activeCustomers: 0, conversionRate: 0
        });

        this.renderUsersTable();
        this.renderPromotionsTable();
        this.renderRecentActivity();
    }

    switchTab(tabName) {
       
        console.log('Cambiando a tab:', tabName);
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sidebar-menu a').forEach(link => link.classList.remove('active'));
        const targetTab = document.getElementById(tabName);
        if (targetTab) targetTab.classList.add('active');
        const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Cargar datos específicos del tab
        switch (tabName) {
            case 'reports':
                this.generateReports();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'promotions':
                this.loadPromotions();
                break;
        }
    }

    switchReportTab(tabName) {
       
        console.log('Cambiando a report tab:', tabName);
        document.querySelectorAll('.report-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('[data-report-tab]').forEach(tab => tab.classList.remove('active'));
        const targetReport = document.getElementById(`${tabName}Report`);
        if (targetReport) targetReport.classList.add('active');
        const activeTab = document.querySelector(`[data-report-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');
    }

    updateUserInfo() {

        document.getElementById('userName').textContent = this.currentUser.email;
        document.getElementById('userAvatar').textContent = this.currentUser.email.charAt(0).toUpperCase();
    }

    updateDashboardStats(stats) {
        
        document.getElementById('totalSales').textContent = `$${stats.totalSales.toLocaleString()}`;
        document.getElementById('totalUsers').textContent = stats.totalUsers.toLocaleString();
        document.getElementById('totalProducts').textContent = stats.totalProducts.toLocaleString();
        document.getElementById('activePromotions').textContent = stats.activePromotions.toLocaleString();
        document.getElementById('monthlyRevenue').textContent = `$${stats.monthlyRevenue.toLocaleString()}`;
        document.getElementById('totalOrders').textContent = stats.totalOrders.toLocaleString();
        document.getElementById('activeCustomers').textContent = stats.activeCustomers.toLocaleString();
        document.getElementById('conversionRate').textContent = `${stats.conversionRate}%`;
    }

    renderUsersTable() {
        // ... (tu código de renderUsersTable sin cambios) ...
        const tbody = document.getElementById('usersTableBody');
        if (this.users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;"><i class="fas fa-users" style="font-size: 3em; margin-bottom: 10px; display: block; opacity: 0.5;"></i>No hay usuarios registrados</td></tr>`;
        } else {
            tbody.innerHTML = '';
            this.users.forEach(user => {
                const row = document.createElement('tr');
                const roleClass = this.getRoleBadgeClass(user.role);
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.email}</td>
                    <td><span class="badge ${roleClass}">${user.role}</span></td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>${user.status}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="openEditUserModal('${user.id}')"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')"><i class="fas fa-trash"></i> Eliminar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    }

    // --- CORREGIDO: renderPromotionsTable ---
    // Actualizado para usar los nombres de columna correctos de tu DB
    renderPromotionsTable() {
        const tbody = document.getElementById('promotionsTableBody');

        if (this.promotions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-tags" style="font-size: 3em; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                        No hay promociones creadas
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = '';
            this.promotions.forEach(promo => {
                const row = document.createElement('tr');
                const valor = promo.tipo_descuento === 'PORCENTAJE' ? `${promo.valor}%` : `$${promo.valor}`;
                const inicio = new Date(promo.fecha_inicio).toLocaleDateString();
                const fin = promo.fecha_fin ? new Date(promo.fecha_fin).toLocaleDateString() : 'Indefinido';
                const estado = promo.activa ? '<span class="badge badge-success">Activa</span>' : '<span class="badge badge-secondary">Inactiva</span>';

                row.innerHTML = `
                    <td>${promo.nombre}</td>
                    <td>${promo.descripcion || '-'}</td>
                    <td>${promo.tipo_regla}</td>
                    <td>${valor}</td>
                    <td>${inicio} - ${fin}</td>
                    <td>${estado}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" disabled>
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm" disabled>
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    }

    renderRecentActivity() {
        // ... (tu código de renderRecentActivity sin cambios) ...
        const tbody = document.getElementById('recentActivityBody');
        if (this.activity.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 40px; color: #666;"><i class="fas fa-history" style="font-size: 3em; margin-bottom: 10px; display: block; opacity: 0.5;"></i>No hay actividad reciente</td></tr>`;
        } else {
            tbody.innerHTML = '';
            this.activity.forEach(activity => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${activity.user}</td>
                    <td>${activity.action}</td>
                    <td>${new Date(activity.date).toLocaleString()}</td>
                    <td>${activity.details}</td>
                `;
                tbody.appendChild(row);
            });
        }
    }

    getRoleBadgeClass(role) {
        // ... (tu código de getRoleBadgeClass sin cambios) ...
        const roles = { 'Admin': 'badge-admin', 'AdminInventario': 'badge-inventario', 'Cajero': 'badge-cajero', 'Cliente': 'badge-cliente' };
        return roles[role] || 'badge-cliente';
    }

    // Modal Functions
    openAddUserModal() { document.getElementById('addUserModal').style.display = 'flex'; }
    closeAddUserModal() { document.getElementById('addUserModal').style.display = 'none'; document.getElementById('addUserForm').reset(); }
    openEditUserModal(userId) { /* ... tu lógica ... */ }
    closeEditUserModal() { document.getElementById('editUserModal').style.display = 'none'; document.getElementById('editUserForm').reset(); }
    openAddPromotionModal() { document.getElementById('addPromotionModal').style.display = 'flex'; }
    closeAddPromotionModal() { document.getElementById('addPromotionModal').style.display = 'none'; document.getElementById('addPromotionForm').reset(); }

    // Form Handlers
    async handleAddUser(e) {
        // ... (tu código de handleAddUser sin cambios) ...
        e.preventDefault();
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
        const role = document.getElementById('userRole').value;
        const token = localStorage.getItem('supabase-token');
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creando...';
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: email, password: password, role: role })
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message || 'Usuario creado exitosamente.');
                this.closeAddUserModal();
                this.loadUsers();
            } else {
                alert(`Error: ${data.message || 'No se pudo crear el usuario.'}`);
            }
        } catch (error) {
            console.error('Error de red al agregar usuario:', error);
            alert('Error de red. Inténtalo de nuevo.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Crear Usuario';
        }
    }

    async handleEditUser(e) {
        // ... (tu código de handleEditUser sin cambios) ...
        e.preventDefault();
        const userId = document.getElementById('editUserId').value;
        const role_id = document.getElementById('editUserRole').value;
        const token = localStorage.getItem('supabase-token');
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Actualizando...';
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ role_id: role_id })
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message || 'Rol actualizado exitosamente.');
                this.closeEditUserModal();
                this.loadUsers();
            } else {
                alert(`Error: ${data.message || 'No se pudo actualizar el rol.'}`);
            }
        } catch (error) {
            console.error('Error de red al editar usuario:', error);
            alert('Error de red. Inténtalo de nuevo.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Actualizar Rol';
        }
    }


    async handleAddPromotion(e) {
        e.preventDefault();

        // Obtencion el token 
        const token = localStorage.getItem('supabase-token');

        if (!token) {
            alert('Error: No estás autenticado. Por favor, inicia sesión de nuevo.');
            this.logout(true); // Forzar logout
            return;
        }

        // Recolectar todos los datos del formulario
        const promotionData = {
            nombre: document.getElementById('promotionName').value,
            descripcion: document.getElementById('promotionDescription').value || null,
            tipo_descuento: document.getElementById('promotionType').value,
            valor: parseFloat(document.getElementById('promotionValue').value),
            tipo_regla: document.getElementById('promotionRuleType').value,
            valor_regla: document.getElementById('promotionRuleValue').value,
            fecha_inicio: document.getElementById('promotionStart').value,
            fecha_fin: document.getElementById('promotionEnd').value || null,
            activa: document.getElementById('promotionActive').checked
        };

        console.log('Enviando promoción:', promotionData);
        
        // Desactivar botón (buena práctica)
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creando...';

        try {
            // Llamar a la API (¡con la URL base correcta!)
            const response = await fetch(`${this.API_BASE_URL}/api/promociones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Envía el token de admin
                },
                body: JSON.stringify(promotionData),
            });
            
            const data = await response.json(); // Leer respuesta JSON

            if (response.ok) {
                alert('¡Promoción creada con éxito!');
                this.closeAddPromotionModal(); 
                this.loadPromotions(); // <-- Recargar la tabla de promociones
            } else {
                alert(`Error al crear la promoción: ${data.message || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('Error de conexión. No se pudo crear la promoción.');
        } finally {
            // 5. Reactivar botón
            submitButton.disabled = false;
            submitButton.textContent = 'Crear Promoción';
        }
    }

    getRoleName(roleValue) { }
    getRoleValue(roleName) { }

    // Charts
    setupCharts() {}
    setupSalesChart() {}
    setupUsersChart() {}
    setupProductsChart() {}
    setupPerformanceChart() {}
    generateReports() {}
    generateSalesReport() {}

    // Data Loaders
    async loadUsers() {
       
        console.log('Cargando usuarios desde la API...');
        const token = localStorage.getItem('supabase-token');
        if (!token) { this.logout(true); return; }
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/users`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                this.users = data;
                this.renderUsersTable();
            } else {
                console.error('Error al cargar usuarios:', data.message);
                alert(`Error al cargar usuarios: ${data.message}`);
                if (response.status === 401 || response.status === 403) { this.logout(true); }
            }
        } catch (error) {
            console.error('Error de red al cargar usuarios:', error);
            alert('Error de red. No se pudieron cargar los usuarios.');
        }
    }

   
    async loadPromotions() {
        console.log('Cargando promociones desde la API...');

        const token = localStorage.getItem('supabase-token');
        if (!token) { this.logout(true); return; }

        try {
            
            const response = await fetch(`${this.API_BASE_URL}/api/promociones`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.promotions = data; // Almacena las promociones
                this.renderPromotionsTable(); // Dibuja la tabla
            } else {
                console.error('Error al cargar promociones:', data.message);
                // No mostramos alerta para no ser molestos, pero sí en consola.
            }
        } catch (error) {
            console.error('Error de red al cargar promociones:', error);
        }
    }

    logout(force = false) {
        
        const doLogout = () => {
            alert('Sesión cerrada - Redirigiendo al login...');
            localStorage.removeItem('supabase-token');
            localStorage.removeItem('user-email');
            localStorage.removeItem('user-role');
            window.location.href = '../login/login.html';
        };
        if (force) { doLogout(); }
        else { if (confirm('¿Estás seguro de que deseas cerrar sesión?')) { doLogout(); } }
    }
}

// Funciones globales para los event listeners del HTML
function openAddUserModal() { adminPanel.openAddUserModal(); }
function closeAddUserModal() { adminPanel.closeAddUserModal(); }
function openEditUserModal(userId) { adminPanel.openEditUserModal(userId); }
function closeEditUserModal() { adminPanel.closeEditUserModal(); }
function openAddPromotionModal() { adminPanel.openAddPromotionModal(); }
function closeAddPromotionModal() { adminPanel.closeAddPromotionModal(); }
function generateSalesReport() { adminPanel.generateSalesReport(); }
async function deleteUser(userId) { /* ... tu lógica ... */ }

// --- ELIMINADO ---
// Se borró el 'document.addEventListener' duplicado que manejaba 'addPromotionForm'.
// Toda esa lógica ahora vive dentro de la clase AdminPanel.

// --- ÚNICO 'DOMContentLoaded' ---
// Este es el único que debe quedar, para inicializar la clase
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
    console.log('Panel de administración inicializado correctamente');
});