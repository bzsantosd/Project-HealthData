// Gerenciamento de Abas (Navegação SPA)
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

function switchTab(tabId) {
  navItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
  });
  tabContents.forEach(tab => {
    tab.classList.toggle('active', tab.id === tabId);
  });
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tabId = item.getAttribute('data-tab');
    if (tabId) switchTab(tabId);
  });
});

// Botão de notificação redireciona para a aba de alertas
document.getElementById('btnGoAlerts')?.addEventListener('click', () => switchTab('tab-alertas'));

// Sincronização de Tema
const themeToggle = document.getElementById('themeToggle');
const configThemeToggle = document.getElementById('configThemeToggle');
const themeText = document.getElementById('themeText');

function toggleTheme(isDark) {
  const mode = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', mode);
  if (themeText) themeText.innerText = isDark ? 'Escuro' : 'Claro';
  if (configThemeToggle) configThemeToggle.checked = isDark;
}

themeToggle?.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'dark';
  toggleTheme(isDark);
});

configThemeToggle?.addEventListener('change', (e) => {
  toggleTheme(e.target.checked);
});

// Lógica de Colaboradores (CRUD & Tabela)
let todosColaboradores = [];
const avatarColors = ['#0d9488', '#2563eb', '#a855f7', '#d97706', '#dc2626', '#059669', '#db2777', '#4b5563'];

function getInitials(nome) {
  if (!nome) return '--';
  const parts = nome.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nome.substring(0, 2).toUpperCase();
}

function getColorForName(str) {
  if (!str) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// Modal
const modalForm = document.getElementById('modalForm');
const btnOpenModal = document.getElementById('btnOpenModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const form = document.getElementById('colabForm');

function openModal(editData = null) {
  form.reset();
  document.getElementById('colabId').value = '';
  document.getElementById('modalTitle').innerText = 'Cadastrar Colaborador';

  if (editData) {
    document.getElementById('modalTitle').innerText = 'Editar Colaborador';
    document.getElementById('colabId').value = editData.id;
    document.getElementById('nome').value = editData.nome || '';
    document.getElementById('matricula').value = editData.matricula || '';
    document.getElementById('cargo').value = editData.cargo || '';
    document.getElementById('setor').value = editData.setor || '';
    document.getElementById('turno').value = editData.turno || '';
    document.getElementById('status').value = editData.status || 'Ativo';
    document.getElementById('aso_status').value = editData.aso_status || 'Em dia';
    document.getElementById('admissao').value = editData.admissao || '';
  }
  modalForm.classList.add('active');
}

function closeModal() { modalForm.classList.remove('active'); }

btnOpenModal?.addEventListener('click', () => openModal());
btnCloseModal?.addEventListener('click', closeModal);
btnCancelModal?.addEventListener('click', closeModal);

// Carregar Dados da API com Trativa de Erros
async function carregarColaboradores() {
  try {
    const res = await fetch('/api/colaboradores');
    if (!res.ok) throw new Error(`Status ${res.status} ao buscar colaboradores`);
    
    const dados = await res.json();
    todosColaboradores = Array.isArray(dados) ? dados : (dados.data || []);
    renderizarTabela();
  } catch (err) {
    console.error("Erro ao carregar colaboradores:", err);
    const tbody = document.getElementById('colabTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--tag-red-text); padding:24px;">Falha de conexão com o banco de dados.</td></tr>`;
    }
  }
}

// Renderização da Tabela
function renderizarTabela() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const setorFilter = document.getElementById('filterSetor')?.value || '';
  const statusFilter = document.getElementById('filterStatus')?.value || '';

  const filtrados = todosColaboradores.filter(c => {
    const matchSearch = (c.nome || '').toLowerCase().includes(search) || (c.matricula || '').toLowerCase().includes(search);
    const matchSetor = setorFilter ? c.setor === setorFilter : true;
    const matchStatus = statusFilter ? c.status === statusFilter : true;
    return matchSearch && matchSetor && matchStatus;
  });

  const totalEl = document.getElementById('totalCount');
  if (totalEl) totalEl.innerText = todosColaboradores.length;

  const footerText = document.getElementById('footerCountText');
  if (footerText) footerText.innerText = `${filtrados.length} de ${todosColaboradores.length} colaboradores`;
  
  const alertEl = document.getElementById('alertCount');
  if (alertEl) alertEl.innerText = todosColaboradores.filter(c => c.aso_status === 'Vencido').length;

  const tbody = document.getElementById('colabTableBody');
  if (!tbody) return;
  
  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding:24px;">Nenhum colaborador encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(item => {
    const initials = getInitials(item.nome);
    const avatarBg = getColorForName(item.nome);
    
    let asoClass = 'status-green';
    if (item.aso_status === 'A vencer') asoClass = 'status-yellow';
    if (item.aso_status === 'Vencido') asoClass = 'status-red';

    let statusClass = 'status-green';
    if (item.status === 'Pendente') statusClass = 'status-yellow';
    if (item.status === 'Afastado') statusClass = 'status-red';

    return `
      <tr>
        <td>
          <button class="star-btn ${item.favorito ? 'active' : ''}" onclick="toggleFavorito(${item.id}, ${item.favorito})">★</button>
        </td>
        <td>
          <div class="colab-cell">
            <div class="circle-avatar" style="background-color: ${avatarBg}">${initials}</div>
            <div>
              <div class="colab-name">${item.nome}</div>
              <div class="colab-sub">Mat. ${item.matricula} · ${item.cargo}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="color: var(--text-main);">${item.setor}</div>
          <div class="colab-sub">${item.turno}</div>
        </td>
        <td><span class="badge-status ${statusClass}">${item.status || 'Ativo'}</span></td>
        <td><span class="badge-status ${asoClass}">${item.aso_status}</span></td>
        <td style="color: var(--text-muted);">${item.admissao || '-'}</td>
        <td style="text-align: right;">
          <button class="action-btn" title="Editar" onclick='prepararEdicao(${JSON.stringify(item)})'>✏️</button>
          <button class="action-btn" title="Excluir" onclick="deletarColaborador(${item.id})">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

document.getElementById('searchInput')?.addEventListener('input', renderizarTabela);
document.getElementById('filterSetor')?.addEventListener('change', renderizarTabela);
document.getElementById('filterStatus')?.addEventListener('change', renderizarTabela);

// Envio do Formulário (POST / PUT)
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('colabId').value;
  const payload = {
    nome: document.getElementById('nome').value,
    matricula: document.getElementById('matricula').value,
    cargo: document.getElementById('cargo').value,
    setor: document.getElementById('setor').value,
    turno: document.getElementById('turno').value,
    status: document.getElementById('status').value,
    aso_status: document.getElementById('aso_status').value,
    admissao: document.getElementById('admissao').value,
  };

  const url = id ? `/api/colaboradores/${id}` : '/api/colaboradores';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Erro HTTP ${res.status}`);
    }

    closeModal();
    await carregarColaboradores();
  } catch (err) {
    alert(`Erro ao salvar no banco de dados: ${err.message}`);
    console.error("Erro ao enviar dados:", err);
  }
});

window.prepararEdicao = (item) => openModal(item);

window.toggleFavorito = async (id, estadoAtual) => {
  try {
    await fetch(`/api/colaboradores/${id}/favorito`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorito: !estadoAtual })
    });
    carregarColaboradores();
  } catch (err) {
    console.error("Erro ao favoritar:", err);
  }
};

window.deletarColaborador = async (id) => {
  if (confirm('Deseja realmente excluir este colaborador?')) {
    try {
      await fetch(`/api/colaboradores/${id}`, { method: 'DELETE' });
      carregarColaboradores();
    } catch (err) {
      console.error("Erro ao excluir:", err);
    }
  }
};

// Inicializa a listagem
carregarColaboradores();