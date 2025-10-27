// admin.js - Panel de Administración (Versión de prueba)

class AdminPanel {
    constructor() {
        // Se inicializa vacío, se cargará desde localStorage
        this.currentUser = {};

        this.users = [];
        this.promotions = [];
        this.activity = [];

        // Definir la URL base de la API
        this.API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://127.0.0.1:3000'
            : 'https://tiendaonlinepdv-hm20.onrender.com';

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCharts();
        // Carga al usuario y luego los datos iniciales
        this.loadCurrentUser();
    }

    /**
         * Carga los datos del usuario desde localStorage y valida la sesión.
         */
    loadCurrentUser() {
        const token = localStorage.getItem('supabase-token');
        const email = localStorage.getItem('user-email');
        const role = localStorage.getItem('user-role');

        // Si falta algo, la sesión no es válida
        if (!token || !email || !role) {
            alert('Sesión no válida o expirada. Redirigiendo al login.');
            this.logout(true); // true = forzar logout sin confirmar
            return;
        }

        // Si el rol no es Admin, no debería estar aquí
        if (role !== 'Admin') {
            alert('Acceso denegado. No tienes permisos de administrador.');
            this.logout(true);
            return;
        }

        this.currentUser = { email, role };

        // Ahora que tenemos al usuario, actualizamos la UI y cargamos datos
        this.updateUserInfo();
        this.loadInitialData(); // Carga placeholders y tablas vacías
    }

    setupEventListeners() {
        // Navegación entre tabs principales
        document.querySelectorAll('.sidebar-menu a[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

        // Tabs de reportes
        document.querySelectorAll('[data-report-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const reportTab = e.target.getAttribute('data-report-tab');
                this.switchReportTab(reportTab);
            });
        });

        // Formularios
        document.getElementById('addUserForm').addEventListener('submit', (e) => this.handleAddUser(e));
        document.getElementById('editUserForm').addEventListener('submit', (e) => this.handleEditUser(e));
        document.getElementById('addPromotionForm').addEventListener('submit', (e) => this.handleAddPromotion(e));

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }

    loadInitialData() {
        // Inicializar datos vacíos
        this.updateDashboardStats({
            totalSales: 0,
            totalUsers: 0,
            totalProducts: 0,
            activePromotions: 0,
            monthlyRevenue: 0,
            totalOrders: 0,
            activeCustomers: 0,
            conversionRate: 0
        });

        this.renderUsersTable();
        this.renderPromotionsTable();
        this.renderRecentActivity();
    }

    switchTab(tabName) {
        console.log('Cambiando a tab:', tabName);

        // Ocultar todos los tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remover active de todos los links del sidebar
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
        });

        // Mostrar tab seleccionado
        const targetTab = document.getElementById(tabName);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Activar link correspondiente en el sidebar
        const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Cargar datos específicos del tab si es necesario
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

        // Ocultar todos los report tabs
        document.querySelectorAll('.report-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remover active de todos los report tabs
        document.querySelectorAll('[data-report-tab]').forEach(tab => {
            tab.classList.remove('active');
        });

        // Mostrar tab seleccionado
        const targetReport = document.getElementById(`${tabName}Report`);
        if (targetReport) {
            targetReport.classList.add('active');
        }

        // Activar tab correspondiente
        const activeTab = document.querySelector(`[data-report-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    updateUserInfo() {
        // Ahora usa el email de this.currentUser
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
        const tbody = document.getElementById('usersTableBody');

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-users" style="font-size: 3em; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                        No hay usuarios registrados
                    </td>
                </tr>
            `;
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
                        <button class="btn btn-warning btn-sm" onclick="openEditUserModal('${user.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    }

    renderPromotionsTable() {
        const tbody = document.getElementById('promotionsTableBody');

        if (this.promotions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-tags" style="font-size: 3em; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                        No hay promociones activas
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = '';
            this.promotions.forEach(promotion => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${promotion.name}</td>
                    <td>${promotion.type === 'percentage' ? 'Porcentaje' : 'Monto Fijo'}</td>
                    <td>${promotion.type === 'percentage' ? `${promotion.value}%` : `$${promotion.value}`}</td>
                    <td>${new Date(promotion.start_date).toLocaleDateString()} - ${new Date(promotion.end_date).toLocaleDateString()}</td>
                    <td>${promotion.status}</td>
                    <td>
                        <button class="btn btn-warning btn-sm">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    }

    renderRecentActivity() {
        const tbody = document.getElementById('recentActivityBody');

        if (this.activity.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-history" style="font-size: 3em; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                        No hay actividad reciente
                    </td>
                </tr>
            `;
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
        const roles = {
            'Admin': 'badge-admin',
            'AdminInventario': 'badge-inventario',
            'Cajero': 'badge-cajero',
            'Cliente': 'badge-cliente'
        };
        return roles[role] || 'badge-cliente';
    }

    // Modal Functions
    openAddUserModal() {
        document.getElementById('addUserModal').style.display = 'flex';
    }

    closeAddUserModal() {
        document.getElementById('addUserModal').style.display = 'none';
        document.getElementById('addUserForm').reset();
    }

    openEditUserModal(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUserEmail').value = user.email;
            document.getElementById('editUserRole').value = this.getRoleValue(user.role);
            document.getElementById('editUserModal').style.display = 'flex';
        } else {
            alert('Usuario no encontrado');
        }
    }

    closeEditUserModal() {
        document.getElementById('editUserModal').style.display = 'none';
        document.getElementById('editUserForm').reset();
    }

    openAddPromotionModal() {
        document.getElementById('addPromotionModal').style.display = 'flex';
    }

    closeAddPromotionModal() {
        document.getElementById('addPromotionModal').style.display = 'none';
        document.getElementById('addPromotionForm').reset();
    }

    // Form Handlers
    async handleAddUser(e) {
        e.preventDefault(); // Evita que la página se recargue

        // 1. Obtener los datos del formulario
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
        // 'userRole' es el <select> que ya tiene los IDs numéricos (1, 2, 3, 4)
        const role = document.getElementById('userRole').value;

        const token = localStorage.getItem('supabase-token');

        // 2. Desactivar el botón para evitar doble envío
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creando...';

        try {
            // 3. Llamar a la API del backend
            const response = await fetch(`${this.API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Autenticación de Admin
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    role: role // El backend lo espera como 'role'
                })
            });

            const data = await response.json();

            // 4. Manejar la respuesta
            if (response.ok) {
                alert(data.message || 'Usuario creado exitosamente.');
                this.closeAddUserModal(); // Cierra el modal
                this.loadUsers(); // Recarga la tabla de usuarios

            } else {
                // Si falla, mostrar el error traducido del backend
                alert(`Error: ${data.message || 'No se pudo crear el usuario.'}`);
            }

        } catch (error) {
            console.error('Error de red al agregar usuario:', error);
            alert('Error de red. Inténtalo de nuevo.');
        } finally {
            // 5. Reactivar el botón (pase lo que pase)
            submitButton.disabled = false;
            submitButton.textContent = 'Crear Usuario';
        }
    }

    async handleEditUser(e) {
        e.preventDefault(); // Evita que la página se recargue

        // 1. Obtener los datos del formulario
        const userId = document.getElementById('editUserId').value;
        const role_id = document.getElementById('editUserRole').value; // Este es el ID numérico
        const token = localStorage.getItem('supabase-token');

        // 2. Desactivar el botón
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Actualizando...';

        try {
            // 3. Llamar a la API del backend
            const response = await fetch(`${this.API_BASE_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role_id: role_id }) // Enviamos el nuevo role_id
            });

            const data = await response.json();

            // 4. Manejar la respuesta
            if (response.ok) {
                alert(data.message || 'Rol actualizado exitosamente.');
                this.closeEditUserModal();
                this.loadUsers(); // Recargar la tabla
            } else {
                alert(`Error: ${data.message || 'No se pudo actualizar el rol.'}`);
            }
        } catch (error) {
            console.error('Error de red al editar usuario:', error);
            alert('Error de red. Inténtalo de nuevo.');
        } finally {
            // 5. Reactivar el botón
            submitButton.disabled = false;
            submitButton.textContent = 'Actualizar Rol';
        }
    }

    handleAddPromotion(e) {
        e.preventDefault();

        const name = document.getElementById('promotionName').value;
        const type = document.getElementById('promotionType').value;
        const value = document.getElementById('promotionValue').value;
        const start = document.getElementById('promotionStart').value;
        const end = document.getElementById('promotionEnd').value;

        console.log('Creando promoción:', { name, type, value, start, end });
        alert(`Promoción "${name}" creada exitosamente`);

        this.closeAddPromotionModal();
    }

    getRoleName(roleValue) {
        const roles = {
            '1': 'Admin',
            '2': 'Cliente',
            '3': 'Cajero',
            '4': 'AdminInventario'
        };
        return roles[roleValue] || 'Cliente';
    }

    getRoleValue(roleName) {
        const roles = {
            'Admin': '1',
            'Cliente': '2',
            'Cajero': '3',
            'AdminInventario': '4'
        };
        return roles[roleName] || '2';
    }

    // Charts
    setupCharts() {
        this.setupSalesChart();
        this.setupUsersChart();
        this.setupProductsChart();
        this.setupPerformanceChart();
    }

    setupSalesChart() {
        const ctx = document.getElementById('salesChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Ventas Mensuales',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }

    setupUsersChart() {
        const ctx = document.getElementById('usersChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Administradores', 'Cajeros', 'Inventario', 'Clientes'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#e74c3c',
                        '#3498db',
                        '#f39c12',
                        '#27ae60'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    setupProductsChart() {
        const ctx = document.getElementById('productsChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Producto A', 'Producto B', 'Producto C', 'Producto D', 'Producto E'],
                datasets: [{
                    label: 'Unidades Vendidas',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: '#9b59b6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    setupPerformanceChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [
                    {
                        label: 'Ventas Físicas',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: '#3498db'
                    },
                    {
                        label: 'Ventas Online',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: '#2ecc71'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    generateReports() {
        console.log('Generando reportes...');
        // Los charts ya están configurados y se actualizan automáticamente
    }

    generateSalesReport() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            alert('Por favor selecciona ambas fechas');
            return;
        }

        alert(`Generando reporte de ventas desde ${startDate} hasta ${endDate}`);
        console.log('Filtrando ventas por fecha:', { startDate, endDate });
    }

    /**
     * Carga los usuarios desde el nuevo endpoint /api/users
     */
    async loadUsers() {
        console.log('Cargando usuarios desde la API...');

        const token = localStorage.getItem('supabase-token');
        if (!token) {
            this.logout(true); // Forzar logout si no hay token
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // ¡Token de autenticación!
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.users = data; // Almacena los usuarios
                this.renderUsersTable(); // Vuelve a dibujar la tabla con los datos
            } else {
                // Manejar errores (ej. token expirado, no admin)
                console.error('Error al cargar usuarios:', data.message);
                alert(`Error al cargar usuarios: ${data.message}`);
                if (response.status === 401 || response.status === 403) {
                    this.logout(true); // Forzar logout
                }
            }
        } catch (error) {
            console.error('Error de red al cargar usuarios:', error);
            alert('Error de red. No se pudieron cargar los usuarios.');
        }
    }

    async loadPromotions() {
        // En una implementación real, aquí cargarías las promociones desde la API
        console.log('Cargando promociones...');
    }

    /**
     * Cierra la sesión, limpia localStorage y redirige al login.
     * @param {boolean} force - Si es true, cierra sesión sin preguntar.
     */
    logout(force = false) {
        const doLogout = () => {
            alert('Sesión cerrada - Redirigiendo al login...');

            // Limpiar todos los datos de sesión
            localStorage.removeItem('supabase-token');
            localStorage.removeItem('user-email');
            localStorage.removeItem('user-role');

            // Asumiendo que login.html está en una carpeta 'login'
            // al mismo nivel que la carpeta 'admin'
            window.location.href = '../login/login.html';
        };

        if (force) {
            doLogout();
        } else {
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                doLogout();
            }
        }
    }

}

// Funciones globales para los event listeners del HTML
function openAddUserModal() {
    adminPanel.openAddUserModal();
}

function closeAddUserModal() {
    adminPanel.closeAddUserModal();
}

function openEditUserModal(userId) {
    adminPanel.openEditUserModal(userId);
}

function closeEditUserModal() {
    adminPanel.closeEditUserModal();
}

function openAddPromotionModal() {
    adminPanel.openAddPromotionModal();
}

function closeAddPromotionModal() {
    adminPanel.closeAddPromotionModal();
}

function generateSalesReport() {
    adminPanel.generateSalesReport();
}

async function deleteUser(userId) {
    // El adminPanel debe estar disponible globalmente
    if (!adminPanel) {
        console.error('AdminPanel no está inicializado.');
        return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
        
        const token = localStorage.getItem('supabase-token');
        
        try {
            const response = await fetch(`${adminPanel.API_BASE_URL}/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}` // Autenticación de Admin
                }
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || 'Usuario eliminado exitosamente.');
                adminPanel.loadUsers(); // Recargar la tabla
            } else {
                alert(`Error: ${data.message || 'No se pudo eliminar el usuario.'}`);
            }
        } catch (error) {
            console.error('Error de red al eliminar usuario:', error);
            alert('Error de red. Inténtalo de nuevo.');
        }
    }
}

// Inicializar el panel de administración cuando se carga la página
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
    console.log('Panel de administración inicializado correctamente');
});