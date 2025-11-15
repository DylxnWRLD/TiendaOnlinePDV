// admin.js - VERSIÓN CORREGIDA Y LIMPIA

class AdminPanel {
    constructor() {
        this.currentUser = {};
        this.users = [];
        this.promotions = [];
        this.activity = [];

        // ⭐️ CORRECCIÓN 1: Inicializar todos los gráficos
        this.performanceChartInstance = null;
        this.salesChartInstance = null;
        this.usersChartInstance = null;
        this.productsChartInstance = null;

        this.API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://127.0.0.1:3000'
            : 'https://tiendaonlinepdv.onrender.com';

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCharts();
        this.loadCurrentUser();
    }

    loadCurrentUser() {
        const token = sessionStorage.getItem('supabase-token');
        const email = sessionStorage.getItem('user-email');
        const role = sessionStorage.getItem('user-role');

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

        document.getElementById('addUserForm').addEventListener('submit', (e) => this.handleAddUser(e));
        document.getElementById('editUserForm').addEventListener('submit', (e) => this.handleEditUser(e));
        document.getElementById('addPromotionForm').addEventListener('submit', (e) => this.handleAddPromotion(e));
        document.getElementById('editPromotionForm').addEventListener('submit', (e) => this.handleEditPromotion(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        const ruleTypeSelect = document.getElementById('promotionRuleType');
        const ruleValueGroup = document.getElementById('promotionRuleValueGroup');
        const ruleValueInput = document.getElementById('promotionRuleValue');

        if (ruleTypeSelect) {
            const toggleRuleValueField = () => {
                if (!ruleTypeSelect.value) return;
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
            // (Sin binding dinámico)
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
        this.loadAllStats();
    }

    switchTab(tabName) {
        console.log('Cambiando a tab:', tabName);
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sidebar-menu a').forEach(link => link.classList.remove('active'));
        const targetTab = document.getElementById(tabName);
        if (targetTab) targetTab.classList.add('active');
        const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeLink) activeLink.classList.add('active');

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
            case 'performance':
                this.loadAllStats();
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
                const estado = promo.activa
                    ? '<span class="badge badge-success">Activa</span>'
                    : '<span class="badge badge-secondary">Inactiva</span>';

                row.innerHTML = `
                <td>${promo.nombre}</td>
                <td>${promo.descripcion || '-'}</td>
                <td>${promo.tipo_regla}</td>
                <td>${valor}</td>
                <td>${inicio} - ${fin}</td>
                <td>${estado}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="abrirModalEditar(${promo.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="adminPanel.eliminarPromocion(${promo.id})">
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
        const roles = {
            'Admin': 'badge-admin',
            'AdminInventario': 'badge-inventario',
            'Cajero': 'badge-cajero',
            'Cliente': 'badge-cliente',
            'Repartidor': 'badge-repartidor' // ⭐️ NUEVO: Clase para Repartidor
        };
        return roles[role] || 'badge-cliente';
    }

    // --- MODAL FUNCTIONS ---
    openAddUserModal() { document.getElementById('addUserModal').style.display = 'flex'; }
    closeAddUserModal() { document.getElementById('addUserModal').style.display = 'none'; document.getElementById('addUserForm').reset(); }

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
    closeEditUserModal() { document.getElementById('editUserModal').style.display = 'none'; document.getElementById('editUserForm').reset(); }

    openAddPromotionModal() { document.getElementById('addPromotionModal').style.display = 'flex'; }
    closeAddPromotionModal() { document.getElementById('addPromotionModal').style.display = 'none'; document.getElementById('addPromotionForm').reset(); }

    abrirModalEditar(id) {
        const promo = this.promotions.find(p => p.id === id);
        if (!promo) return alert('Promoción no encontrada');
        document.getElementById('editPromotionId').value = promo.id;
        document.getElementById('editPromotionName').value = promo.nombre;
        document.getElementById('editPromotionDescription').value = promo.descripcion || '';
        document.getElementById('editPromotionType').value = promo.tipo_descuento;
        document.getElementById('editPromotionValue').value = promo.valor;
        document.getElementById('editPromotionRuleType').value = promo.tipo_regla;
        document.getElementById('editPromotionRuleValue').value = promo.valor_regla || '';
        document.getElementById('editPromotionStart').value = promo.fecha_inicio.slice(0, 16);
        document.getElementById('editPromotionEnd').value = promo.fecha_fin ? promo.fecha_fin.slice(0, 16) : '';
        document.getElementById('editPromotionActive').checked = promo.activa;
        document.getElementById('editPromotionModal').style.display = 'flex';
    }

    cerrarModalEditar() {
        document.getElementById('editPromotionModal').style.display = 'none';
        document.getElementById('editPromotionForm').reset();
    }

    // --- FORM HANDLERS ---

    async handleEditPromotion(e) {
        e.preventDefault();
        const id = document.getElementById('editPromotionId').value;
        const token = sessionStorage.getItem('supabase-token');
        if (!token) { this.logout(true); return; }

        const data = {
            nombre: document.getElementById('editPromotionName').value,
            descripcion: document.getElementById('editPromotionDescription').value || null,
            tipo_descuento: document.getElementById('editPromotionType').value,
            valor: parseFloat(document.getElementById('editPromotionValue').value),
            tipo_regla: document.getElementById('editPromotionRuleType').value,
            valor_regla: document.getElementById('editPromotionRuleValue').value || null,
            fecha_inicio: document.getElementById('editPromotionStart').value,
            fecha_fin: document.getElementById('editPromotionEnd').value || null,
            activa: document.getElementById('editPromotionActive').checked
        };

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Actualizando...';

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/promociones/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                alert('Promoción actualizada con éxito');
                this.cerrarModalEditar();
                this.loadPromotions();
            } else {
                alert(`Error al actualizar: ${result.message || 'Desconocido'}`);
            }
        } catch (error) {
            console.error('Error de red al actualizar promoción:', error);
            alert('Error de red. Inténtalo de nuevo.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Actualizar Promoción';
        }
    }

    async eliminarPromocion(id) {
        if (!confirm("¿Deseas eliminar esta promoción?")) return;
        const token = sessionStorage.getItem('supabase-token');
        if (!token) { this.logout(true); return; }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/promociones/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                alert('Promoción eliminada con éxito');
                this.loadPromotions();
            } else {
                alert(`Error al eliminar la promoción: ${data.message || 'Desconocido'}`);
            }
        } catch (error) {
            console.error('Error al eliminar promoción:', error);
            alert('Error de red. Inténtalo de nuevo.');
        }
    }

    async handleAddUser(e) {
        e.preventDefault();
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
        const role = document.getElementById('userRole').value;
        const token = sessionStorage.getItem('supabase-token');
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
            alert('Error de red. No se pudo crear el usuario.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Crear Usuario';
        }
    }

    async handleEditUser(e) {
        e.preventDefault();
        const userId = document.getElementById('editUserId').value;
        const role_id = document.getElementById('editUserRole').value;
        const token = sessionStorage.getItem('supabase-token');
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
            alert('Error de red. No se pudo actualizar el usuario.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Actualizar Rol';
        }
    }

    async handleAddPromotion(e) {
        e.preventDefault();
        const token = sessionStorage.getItem('supabase-token');
        if (!token) {
            alert('Error: No estás autenticado. Por favor, inicia sesión de nuevo.');
            this.logout(true);
            return;
        }

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

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creando...';

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/promociones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(promotionData),
            });
            const data = await response.json();
            if (response.ok) {
                alert('¡Promoción creada con éxito!');
                this.closeAddPromotionModal();
                this.loadPromotions();
            } else {
                alert(`Error al crear la promoción: ${data.message || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('Error de conexión. No se pudo crear la promoción.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Crear Promoción';
        }
    }

    // --- HELPERS ---
    getRoleName(roleValue) {
        // ⭐️ ACTUALIZADO: ID 5 para Repartidor ⭐️
        const roles = { '1': 'Admin', '2': 'Cliente', '3': 'Cajero', '4': 'AdminInventario', '5': 'Repartidor' };
        return roles[roleValue] || 'Cliente';
    }

    getRoleValue(roleName) {
        // ⭐️ ACTUALIZADO: Nombre 'Repartidor' a ID 5 ⭐️
        const roles = { 'Admin': '1', 'Cliente': '2', 'Cajero': '3', 'AdminInventario': '4', 'Repartidor': '5' };
        return roles[roleName] || '2';
    }

    // --- CHARTS ---
    setupCharts() {
        this.setupSalesChart();
        this.setupUsersChart();
        this.setupProductsChart();
        this.setupPerformanceChart();
    }

    setupSalesChart() {
        const ctx = document.getElementById('salesChart').getContext('2d');
        // ⭐️ CORRECCIÓN 2: Guardar instancia
        this.salesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['-'],
                datasets: [{
                    label: 'Ventas por día',
                    data: [0],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    setupUsersChart() {
        const ctx = document.getElementById('usersChart').getContext('2d');
        // ⭐️ CORRECCIÓN 3: Guardar instancia
        this.usersChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Administradores', 'Cajeros', 'Inventario', 'Clientes'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#e74c3c', '#3498db', '#f39c12', '#27ae60']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    setupProductsChart() {
        const ctx = document.getElementById('productsChart').getContext('2d');
        this.productsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Producto A', 'Producto B', 'Producto C', 'Producto D', 'Producto E'],
                datasets: [{
                    label: 'Cantidad en Stock',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: '#9b59b6'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    setupPerformanceChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        this.performanceChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [
                    { label: 'Ventas Físicas', data: [0, 0, 0, 0, 0, 0, 0], backgroundColor: '#3498db' },
                    { label: 'Ventas Online', data: [0, 0, 0, 0, 0, 0, 0], backgroundColor: '#2ecc71' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // --- REPORT FUNCTIONS ---
    generateReports() {
        console.log('Pintando reportes (datos ya cargados).');
        const today = new Date().toISOString().split('T')[0];
        if (!document.getElementById('endDate').value) {
            document.getElementById('endDate').value = today;
        }
        if (!document.getElementById('startDate').value) {
            const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            document.getElementById('startDate').value = sevenDaysAgo;
        }
    }

    async generateSalesReport() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            alert('Por favor selecciona ambas fechas');
            return;
        }

        console.log('Generando reporte de ventas...');
        const token = sessionStorage.getItem('supabase-token');
        if (!token) return;

        const button = document.querySelector('#salesReport button');
        button.disabled = true;
        button.textContent = 'Generando...';

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/reports/sales?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const report = await response.json();
            if (!response.ok) throw new Error(report.message);

            if (this.salesChartInstance) {
                this.salesChartInstance.data.labels = report.labels;
                this.salesChartInstance.data.datasets[0].data = report.data;
                this.salesChartInstance.update();
            }
        } catch (error) {
            console.error('Error al generar reporte de ventas:', error.message);
            alert(`No se pudo generar el reporte: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = 'Generar Reporte';
        }
    }

    // --- DATA LOADERS ---
    async loadUsers() {
        console.log('Cargando usuarios desde la API...');
        const token = sessionStorage.getItem('supabase-token');
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
        const token = sessionStorage.getItem('supabase-token');
        if (!token) { this.logout(true); return; }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/promociones`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                this.promotions = data;
                this.renderPromotionsTable();
            } else {
                console.error('Error al cargar promociones:', data.message);
            }
        } catch (error) {
            console.error('Error de red al cargar promociones:', error);
        }
    }

    async loadAllStats() {
        console.log('Cargando todas las estadísticas...');
        const token = sessionStorage.getItem('supabase-token');
        if (!token) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/stats/full`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const stats = await response.json();
            if (!response.ok) throw new Error(stats.message);

            // 1. Actualizar TODAS las 8 tarjetas
            this.updateDashboardStats(stats);

            // 2. Actualizar el gráfico de rendimiento
            if (this.performanceChartInstance && stats.chartData) {
                this.performanceChartInstance.data.labels = stats.chartData.labels;
                this.performanceChartInstance.data.datasets[0].data = stats.chartData.sales;
                this.performanceChartInstance.data.datasets[1].data = new Array(stats.chartData.labels.length).fill(0);
                this.performanceChartInstance.update();
            }

            // 3. Actualizar gráfico de Reporte de Usuarios
            if (this.usersChartInstance && stats.usersReport) {
                this.usersChartInstance.data.labels = stats.usersReport.labels;
                this.usersChartInstance.data.datasets[0].data = stats.usersReport.data;
                this.usersChartInstance.update();
            }

            // 4. Actualizar gráfico de Reporte de Productos
            if (this.productsChartInstance && stats.productsReport) {
                this.productsChartInstance.data.labels = stats.productsReport.labels;
                this.productsChartInstance.data.datasets[0].data = stats.productsReport.data;
                this.productsChartInstance.update();
            }

        } catch (error) {
            console.error('Error al cargar estadísticas completas:', error.message);
            alert(`No se pudieron cargar las estadísticas: ${error.message}`);
        }
    }

    // --- LOGOUT ---
    logout(force = false) {
        const doLogout = () => {
            alert('Sesión cerrada - Redirigiendo al login...');
            sessionStorage.clear(); // Esto borra todo en sessionStorage
            window.location.href = '../login/login.html';
        };
        if (force) { doLogout(); }
        else { if (confirm('¿Estás seguro de que deseas cerrar sesión?')) { doLogout(); } }
    }
} // ⭐️ FIN DE LA CLASE AdminPanel

// ===============================================
// ⭐️ INICIALIZACIÓN Y FUNCIONES GLOBALES ⭐️
// ===============================================

let adminPanel;

// Funciones globales (solo las necesarias para el HTML)
function openAddUserModal() { adminPanel.openAddUserModal(); }
function closeAddUserModal() { adminPanel.closeAddUserModal(); }
function openEditUserModal(userId) { adminPanel.openEditUserModal(userId); }
function closeEditUserModal() { adminPanel.closeEditUserModal(); }
function openAddPromotionModal() { adminPanel.openAddPromotionModal(); }
function closeAddPromotionModal() { adminPanel.closeAddPromotionModal(); }
function abrirModalEditar(id) { adminPanel.abrirModalEditar(id); }
function cerrarModalEditar() { adminPanel.cerrarModalEditar(); }
function generateSalesReport() { adminPanel.generateSalesReport(); }

async function deleteUser(userId) {
    if (!adminPanel) { console.error('AdminPanel no está inicializado.'); return; }

    if (confirm('¿Estás seguro de que deseas desactivar este usuario? El usuario ya no aparecerá en la lista')) {
        const token = sessionStorage.getItem('supabase-token');
        try {
            const response = await fetch(`${adminPanel.API_BASE_URL}/api/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                adminPanel.loadUsers();
            } else {
                alert(`Error: ${data.message || 'No se pudo desactivar el usuario.'}`);
            }
        } catch (error) {
            console.error('Error de red al desactivar usuario:', error);
            alert('Error de red. Inténtalo de nuevo.');
        }
    }
}

// Inicializador principal
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
    console.log('Panel de administración inicializado correctamente');
});