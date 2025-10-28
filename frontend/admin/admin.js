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
    if (confirm('¿Estás seguro de que deseas desactivar este usuario? El usuario ya no aparecerá en la lista')) {
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
                adminPanel.loadUsers(); // Recargar la tabla
            } else {
                alert(`Error: ${data.message || 'No se pudo desactivar el usuario.'}`);
            }
        } catch (error) {
            console.error('Error de red al desactivar usuario:', error);
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