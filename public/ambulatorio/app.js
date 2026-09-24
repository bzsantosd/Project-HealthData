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

document.getElementById('btnGoAlerts')?.addEventListener('click', () => switchTab('tab-colaboradores'));

document.querySelector('button[title="Sair"]')?.addEventListener('click', () => {
  sessionStorage.clear();
  window.location.assign('/login');
});

document.getElementById('btnUserSettings')?.addEventListener('click', () => switchTab('tab-configuracoes'));

document.querySelectorAll('.settings-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.settingsTab;
    document.querySelectorAll('.settings-tab').forEach(item => {
      const isActive = item === tab;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', String(isActive));
    });
    document.querySelectorAll('.settings-panel').forEach(panel => {
      const isActive = panel.id === targetId;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });
  });
});

const settingsProfileUsername = document.getElementById('settingsProfileUsername');
if (settingsProfileUsername) {
  settingsProfileUsername.textContent = sessionStorage.getItem('username') || 'amb@healthdata.com';
}

const themeToggle = document.getElementById('themeToggle');
const configThemeToggle = document.getElementById('configThemeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeText = document.getElementById('themeText');

const sunIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
const moonIcon = '<svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"></path></svg>';

function toggleTheme(isDark) {
  const mode = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', mode);
  if (themeIcon) themeIcon.innerHTML = isDark ? moonIcon : sunIcon;
  if (themeText) themeText.innerText = isDark ? 'Escuro' : 'Claro';
  if (configThemeToggle) configThemeToggle.checked = isDark;
}

toggleTheme(document.documentElement.getAttribute('data-theme') === 'dark');

themeToggle?.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'dark';
  toggleTheme(isDark);
});

configThemeToggle?.addEventListener('change', (e) => {
  toggleTheme(e.target.checked);
});

const publicacaoModal = document.getElementById('publicacaoModal');
const publicacaoForm = document.getElementById('publicacaoForm');
const publicacaoImagem = document.getElementById('publicacaoImagem');
const publicacaoPreview = document.getElementById('publicacaoPreview');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function closePublicacaoModal() {
  publicacaoModal?.classList.remove('active');
  publicacaoForm?.reset();
  if (publicacaoPreview) {
    publicacaoPreview.removeAttribute('src');
    publicacaoPreview.classList.remove('visible');
  }
}

document.getElementById('btnOpenPublicacaoModal')?.addEventListener('click', () => {
  publicacaoModal?.classList.add('active');
});
document.getElementById('btnClosePublicacaoModal')?.addEventListener('click', closePublicacaoModal);
document.getElementById('btnCancelPublicacaoModal')?.addEventListener('click', closePublicacaoModal);

publicacaoImagem?.addEventListener('change', () => {
  const file = publicacaoImagem.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('A foto deve ter no máximo 5 MB.');
    publicacaoImagem.value = '';
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    publicacaoPreview.src = reader.result;
    publicacaoPreview.classList.add('visible');
  });
  reader.readAsDataURL(file);
});

function renderizarPublicacoes(publicacoes) {
  const grid = document.getElementById('publicacoesGrid');
  if (!grid || !Array.isArray(publicacoes)) return;

  publicacoes.forEach(publicacao => {
    const card = document.createElement('article');
    card.className = 'dash-card publication-card';
    const imagem = publicacao.imagem || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=60';
    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${escapeHtml(imagem)}" alt="${escapeHtml(publicacao.titulo)}">
        <span class="tag-floating tag-orange">${escapeHtml(publicacao.categoria)}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(publicacao.titulo)}</h3>
        <p>${escapeHtml(publicacao.descricao)}</p>
      </div>
      <div class="card-footer-info"><span>${escapeHtml(publicacao.informacao || 'Publicado pelo ambulatório')}</span><span class="badge-outline-teal">${escapeHtml(publicacao.status)}</span></div>
    `;
    grid.appendChild(card);
  });
}

async function carregarPublicacoes() {
  try {
    const response = await fetch('/api/ambulatorio/publicacoes');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    renderizarPublicacoes(await response.json());
  } catch (error) {
    console.error('Erro ao carregar publicações:', error);
  }
}

publicacaoForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = publicacaoImagem?.files?.[0];
  const imagem = publicacaoPreview?.src || '';
  const payload = {
    titulo: document.getElementById('publicacaoTitulo').value,
    categoria: document.getElementById('publicacaoCategoria').value,
    informacao: document.getElementById('publicacaoInformacao').value,
    status: document.getElementById('publicacaoStatus').value,
    descricao: document.getElementById('publicacaoDescricao').value,
    imagem
  };

  if (file && file.size > 5 * 1024 * 1024) return;

  try {
    const response = await fetch('/api/ambulatorio/publicacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Erro HTTP ${response.status}`);

    const grid = document.getElementById('publicacoesGrid');
    if (grid) grid.querySelectorAll('.publication-card').forEach(card => card.remove());
    closePublicacaoModal();
    await carregarPublicacoes();
    switchTab('tab-dashboard');
  } catch (error) {
    alert(`Erro ao publicar: ${error.message}`);
    console.error('Erro ao criar publicação:', error);
  }
});

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

async function carregarColaboradores() {
  try {
    const res = await fetch('/api/ambulatorio/colaboradores');
    if (!res.ok) throw new Error(`Status ${res.status} ao buscar colaboradores`);
    const dados = await res.json();
    todosColaboradores = Array.isArray(dados) ? dados : (dados.data || []);
    renderizarTabela();
  } catch (err) {
    console.error('Erro ao carregar colaboradores:', err);
    const tbody = document.getElementById('colabTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--tag-red-text); padding:24px;">Falha de conexão com o banco de dados.</td></tr>';
    }
  }
}

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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding:24px;">Nenhum colaborador encontrado.</td></tr>';
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
          <button type="button" class="action-btn" title="Editar" onclick='prepararEdicao(${JSON.stringify(item)})'>✏️</button>
          <button type="button" class="action-btn" title="Excluir" onclick="deletarColaborador(${item.id})">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

document.getElementById('searchInput')?.addEventListener('input', renderizarTabela);
document.getElementById('filterSetor')?.addEventListener('change', renderizarTabela);
document.getElementById('filterStatus')?.addEventListener('change', renderizarTabela);

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
    console.error('Erro ao enviar dados:', err);
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
    console.error('Erro ao favoritar:', err);
  }
};

window.deletarColaborador = async (id) => {
  if (confirm('Deseja realmente excluir este colaborador?')) {
    try {
      await fetch(`/api/colaboradores/${id}`, { method: 'DELETE' });
      carregarColaboradores();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  }
};

const exameModal = document.getElementById('exameModal');
const btnOpenExameModal = document.getElementById('btnOpenExameModal');
const btnCloseExameModal = document.getElementById('btnCloseExameModal');
const btnCancelExameModal = document.getElementById('btnCancelExameModal');
const exameForm = document.getElementById('exameForm');

function openExameModal(editData = null) {
  exameForm.reset();
  document.getElementById('exameId').value = '';
  document.getElementById('exameModalTitle').innerText = 'Cadastrar Exame';

  if (editData) {
    document.getElementById('exameModalTitle').innerText = 'Editar Exame';
    document.getElementById('exameId').value = editData.id;
    document.getElementById('exameIdInput').value = editData.id || '';
    document.getElementById('exameColaborador').value = editData.colaborador || '';
    document.getElementById('exameTipo').value = editData.tipo || '';
    document.getElementById('exameData').value = editData.data || '';
    document.getElementById('exameResultado').value = editData.resultado || 'Normal';
    document.getElementById('exameMedico').value = editData.medico || '';
    document.getElementById('exameObservacao').value = editData.observacao || '';
  }

  exameModal.classList.add('active');
}

function closeExameModal() { exameModal.classList.remove('active'); }

btnOpenExameModal?.addEventListener('click', () => openExameModal());
btnCloseExameModal?.addEventListener('click', closeExameModal);
btnCancelExameModal?.addEventListener('click', closeExameModal);

exameForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('exameId').value;
  const payload = {
    id: document.getElementById('exameIdInput').value,
    colaborador: document.getElementById('exameColaborador').value,
    tipo: document.getElementById('exameTipo').value,
    data: document.getElementById('exameData').value,
    resultado: document.getElementById('exameResultado').value,
    medico: document.getElementById('exameMedico').value,
    observacao: document.getElementById('exameObservacao').value,
  };

  const url = id ? `/api/ambulatorio/exames/${id}` : '/api/ambulatorio/exames';
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

    closeExameModal();
    await carregarExames();
  } catch (err) {
    alert(`Erro ao salvar exame: ${err.message}`);
    console.error('Erro ao salvar exame:', err);
  }
});

const medicoModal = document.getElementById('medicoModal');
const btnOpenMedicoModal = document.getElementById('btnOpenMedicoModal');
const btnCloseMedicoModal = document.getElementById('btnCloseMedicoModal');
const btnCancelMedicoModal = document.getElementById('btnCancelMedicoModal');
const medicoForm = document.getElementById('medicoForm');

function openMedicoModal(editData = null) {
  medicoForm.reset();
  document.getElementById('medicoId').value = '';
  document.getElementById('medicoModalTitle').innerText = 'Credenciar Médico';

  if (editData) {
    document.getElementById('medicoModalTitle').innerText = 'Editar Médico';
    document.getElementById('medicoId').value = editData.id;
    document.getElementById('medicoNome').value = editData.nome || '';
    document.getElementById('medicoEspecialidade').value = editData.especialidade || '';
    document.getElementById('medicoCrm').value = editData.crm || '';
    document.getElementById('medicoTelefone').value = editData.telefone || '';
    document.getElementById('medicoEmail').value = editData.email || '';
    document.getElementById('medicoStatus').value = editData.status || 'Disponível';
    document.getElementById('medicoAtendimentos').value = editData.atendimentos || 0;
    document.getElementById('medicoAvaliacao').value = editData.avaliacao || 5;
  }

  medicoModal.classList.add('active');
}

function closeMedicoModal() { medicoModal.classList.remove('active'); }

btnOpenMedicoModal?.addEventListener('click', () => openMedicoModal());
btnCloseMedicoModal?.addEventListener('click', closeMedicoModal);
btnCancelMedicoModal?.addEventListener('click', closeMedicoModal);

medicoForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('medicoId').value;
  const payload = {
    nome: document.getElementById('medicoNome').value,
    especialidade: document.getElementById('medicoEspecialidade').value,
    crm: document.getElementById('medicoCrm').value,
    telefone: document.getElementById('medicoTelefone').value,
    email: document.getElementById('medicoEmail').value,
    status: document.getElementById('medicoStatus').value,
    atendimentos: Number(document.getElementById('medicoAtendimentos').value || 0),
    avaliacao: Number(document.getElementById('medicoAvaliacao').value || 5),
  };

  const url = id ? `/api/ambulatorio/medicos/${id}` : '/api/ambulatorio/medicos';
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

    closeMedicoModal();
    await carregarMedicos();
  } catch (err) {
    alert(`Erro ao salvar médico: ${err.message}`);
    console.error('Erro ao salvar médico:', err);
  }
});

async function carregarExames() {
  try {
    const res = await fetch('/api/ambulatorio/exames');
    const exames = await res.json();
    const tbody = document.getElementById('examesTableBody');
    if (!tbody) return;

    tbody.innerHTML = exames.map(e => {
      let resClass = 'badge-green';
      if (e.resultado === 'Alterado') resClass = 'badge-red';
      if (e.resultado === 'Pendente') resClass = 'badge-yellow';
      if (e.resultado === 'Em Análise') resClass = 'badge-blue';

      return `
        <tr>
          <td style="color:var(--text-muted); font-size:12px;">${e.id}</td>
          <td><strong>${e.colaborador}</strong></td>
          <td>${e.tipo}</td>
          <td>${e.data}</td>
          <td><span class="badge ${resClass}">${e.resultado}</span></td>
          <td>${e.medico || '—'}</td>
          <td style="color:var(--text-muted);">${e.observacao || ''}</td>
          <td style="text-align:right;">
            <button type="button" class="action-btn" title="Editar" onclick='editarExame(${JSON.stringify(e)})'>✏️</button>
            <button type="button" class="action-btn" title="Excluir" onclick="deletarExame('${e.id}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Erro ao carregar exames:', err);
  }
}

window.editarExame = (item) => openExameModal(item);

window.deletarExame = async (id) => {
  if (!confirm('Deseja realmente excluir este exame?')) return;
  try {
    await fetch(`/api/ambulatorio/exames/${id}`, { method: 'DELETE' });
    carregarExames();
  } catch (err) {
    console.error('Erro ao excluir exame:', err);
  }
};

async function carregarMedicos() {
  try {
    const res = await fetch('/api/ambulatorio/medicos');
    const medicos = await res.json();
    const grid = document.getElementById('medicosGrid');
    if (!grid) return;

    grid.innerHTML = medicos.map(m => `
      <div class="medico-card">
        <div class="medico-header">
          <div class="medico-avatar">${(m.nome || '').split(' ').map(n => n[0]).join('').slice(0, 2) || 'MD'}</div>
          <div>
            <h3>${m.nome}</h3>
            <p class="subtitle">${m.especialidade}</p>
          </div>
          <span class="badge ${m.status === 'Disponível' ? 'badge-green' : 'badge-gray'}">${m.status}</span>
        </div>
        <div class="medico-body">
          <p>CRM/SP ${m.crm}</p>
          <p>${m.telefone || 'Telefone não informado'}</p>
          <p>${m.email || 'E-mail não informado'}</p>
        </div>
        <div class="medico-footer">
          <span>Atendimentos: <strong>${m.atendimentos || 0}</strong></span>
          <span class="stars">★ ${Number(m.avaliacao || 5).toFixed(1)}</span>
        </div>
        <div class="medico-actions">
          <button type="button" class="action-btn" onclick='editarMedico(${JSON.stringify(m)})'>✏️</button>
          <button type="button" class="action-btn" onclick="deletarMedico(${m.id})">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar médicos:', err);
  }
}

window.editarMedico = (item) => openMedicoModal(item);

window.deletarMedico = async (id) => {
  if (!confirm('Deseja realmente excluir este médico?')) return;
  try {
    await fetch(`/api/ambulatorio/medicos/${id}`, { method: 'DELETE' });
    carregarMedicos();
  } catch (err) {
    console.error('Erro ao excluir médico:', err);
  }
};

carregarColaboradores();
carregarExames();
carregarMedicos();
carregarPublicacoes();
