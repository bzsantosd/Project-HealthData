// ==========================================
// 1. GERENCIAMENTO DE ABAS E NAVEGAÇÃO
// ==========================================
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

const settingsNavButton = document.querySelector('.nav-item[data-tab="tab-configuracoes"]');
if (settingsNavButton) {
  settingsNavButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>';
}

const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeText = document.getElementById('themeText');

const sunIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
const moonIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"></path></svg>';

function updateThemeControl(isLight) {
  if (themeIcon) themeIcon.innerHTML = isLight ? sunIcon : moonIcon;
  if (themeText) themeText.textContent = isLight ? 'Claro' : 'Escuro';
}

themeToggle?.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') !== 'light';
  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
  updateThemeControl(isLight);
});

updateThemeControl(document.documentElement.getAttribute('data-theme') === 'light');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

let perfilAtual = null;
let encaminhamentosAtuais = [];

function renderizarCondicoes(condicoes) {
  const sideCard = document.getElementById('condicoesCard');
  if (!sideCard) return;

  const lista = (condicoes || []).map(cond => `
    <div class="condition-item ${escapeHtml(cond.cor)}">
      <strong>${escapeHtml(cond.tipo)}</strong>
      <p>${escapeHtml(cond.desc)}</p>
    </div>
  `).join('');

  sideCard.innerHTML = `<h3>CONDIÇÕES E RESTRIÇÕES</h3>${lista || '<p class="empty-state">Nenhuma condição informada.</p>'}`;
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tabId = item.getAttribute('data-tab');

    // Remove classe ativa de todas as abas e botões
    navItems.forEach(n => n.classList.remove('active'));
    tabContents.forEach(t => t.classList.remove('active'));

    // Ativa a aba e o botão selecionado
    item.classList.add('active');
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
      targetTab.classList.add('active');
    }
  });
});

function switchFuncionarioTab(tabId) {
  navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-tab') === tabId));
  tabContents.forEach(tab => tab.classList.toggle('active', tab.id === tabId));
}

document.getElementById('btnUserSettings')?.addEventListener('click', () => switchFuncionarioTab('tab-configuracoes'));

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

document.getElementById('settingsThemeToggle')?.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') !== 'light';
  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
  updateThemeControl(isLight);
});

const settingsProfileUsername = document.getElementById('settingsProfileUsername');
if (settingsProfileUsername) settingsProfileUsername.textContent = sessionStorage.getItem('username') || 'func@healthdata.com';

document.querySelector('button[title="Sair"]')?.addEventListener('click', () => {
  sessionStorage.clear();
  window.location.assign('/login');
});

// ==========================================
// 2. CARREGAR DADOS DO PERFIL DO FUNCIONÁRIO
// ==========================================
async function carregarPerfil() {
  try {
    const response = await fetch('/api/funcionario/perfil');
    if (!response.ok) throw new Error("Erro ao buscar perfil");

    const data = await response.json();
    perfilAtual = data;

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || '-';
    };

    setText('perfilSubtitle', `${data.nome} · Matrícula ${data.matricula}`);
    setText('perfilNome', data.nome);
    setText('perfilResumo', `${data.cargo} · ${data.setor}`);
    setText('perfilStatus', `${data.turno} — ${data.status}`);
    setText('perfilNomeCompleto', data.nome);
    setText('perfilIdade', data.idade ? `${data.idade} anos` : '-');
    setText('perfilSangue', data.tipoSanguineo);
    setText('perfilMatricula', data.matricula);
    setText('perfilAdmissao', data.admissao);
    setText('perfilCargo', data.cargo);
    setText('perfilSetor', data.setor);
    setText('perfilTurno', data.turno);
    setText('perfilRegime', data.regime);

    renderizarCondicoes(data.condicoes);

  } catch (error) {
    console.error("Erro ao carregar o perfil:", error);
  }
}

const perfilModal = document.getElementById('perfilModal');
const perfilForm = document.getElementById('perfilForm');

function fecharPerfilModal() {
  perfilModal?.classList.remove('active');
  perfilModal?.setAttribute('aria-hidden', 'true');
}

document.getElementById('btnEditarPerfil')?.addEventListener('click', () => {
  document.getElementById('perfilAlergias').value = (perfilAtual?.alergias || []).join('\n');
  document.getElementById('perfilComorbidades').value = (perfilAtual?.comorbidades || []).join('\n');
  perfilModal?.classList.add('active');
  perfilModal?.setAttribute('aria-hidden', 'false');
});
document.getElementById('btnFecharPerfil')?.addEventListener('click', fecharPerfilModal);
document.getElementById('btnCancelarPerfil')?.addEventListener('click', fecharPerfilModal);

perfilForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const payload = {
    alergias: document.getElementById('perfilAlergias').value,
    comorbidades: document.getElementById('perfilComorbidades').value
  };

  try {
    const response = await fetch('/api/funcionario/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Erro HTTP ${response.status}`);
    perfilAtual = result;
    renderizarCondicoes(result.condicoes);
    fecharPerfilModal();
  } catch (error) {
    alert(`Não foi possível salvar o perfil: ${error.message}`);
    console.error('Erro ao atualizar perfil:', error);
  }
});

async function carregarPublicacoes() {
  try {
    const response = await fetch('/api/ambulatorio/publicacoes');
    if (!response.ok) throw new Error('Erro ao buscar publicações');
    const publicacoes = await response.json();
    const grid = document.getElementById('publicacoesGrid');
    if (!grid || !Array.isArray(publicacoes)) return;

    publicacoes.forEach(publicacao => {
      const card = document.createElement('article');
      card.className = 'dash-card employee-publication-card';
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
  } catch (error) {
    console.error('Erro ao carregar publicações:', error);
  }
}

async function carregarMedicosCredenciados() {
  const directory = document.getElementById('doctorDirectory');
  if (!directory) return;

  try {
    const response = await fetch('/api/ambulatorio/medicos');
    if (!response.ok) throw new Error('Erro ao buscar médicos credenciados');
    const medicos = await response.json();

    if (!Array.isArray(medicos) || medicos.length === 0) {
      directory.innerHTML = '<p class="directory-empty">Nenhum médico credenciado disponível no momento.</p>';
      return;
    }

    directory.innerHTML = medicos.map(medico => {
      const iniciais = (medico.nome || 'MD').split(' ').map(nome => nome[0]).join('').slice(0, 2).toUpperCase();
      const statusDisponivel = medico.status === 'Disponível';
      return `
        <article class="doctor-directory-card">
          <div class="doctor-avatar">${escapeHtml(iniciais)}</div>
          <div class="doctor-info">
            <div class="doctor-name-row"><h3>${escapeHtml(medico.nome)}</h3><span class="doctor-status ${statusDisponivel ? 'is-available' : 'is-busy'}">${escapeHtml(medico.status || 'Indisponível')}</span></div>
            <p class="doctor-specialty">${escapeHtml(medico.especialidade)}</p>
            <p class="doctor-contact">CRM ${escapeHtml(medico.crm)} · ${escapeHtml(medico.telefone || 'Contato pelo ambulatório')}</p>
          </div>
          <div class="doctor-rating">★ ${Number(medico.avaliacao || 0).toFixed(1)}<small>${Number(medico.atendimentos || 0)} atendimentos</small></div>
        </article>
      `;
    }).join('');
  } catch (error) {
    directory.innerHTML = '<p class="directory-empty">Não foi possível carregar a rede credenciada.</p>';
    console.error('Erro ao carregar médicos do funcionário:', error);
  }
}

// ==========================================
// 3. CARREGAR ALERTAS E ENCAMINHAMENTOS
// ==========================================
async function carregarAlertas() {
  try {
    const response = await fetch('/api/funcionario/alertas');
    if (!response.ok) throw new Error("Erro ao buscar alertas");

    const data = await response.json();

    // Preenche o Banner de Alerta Principal
    const alertBanner = document.querySelector('.alert-banner-red');
    if (alertBanner && data.pendenciaPrincipal) {
      const p = data.pendenciaPrincipal;
      alertBanner.querySelector('.alert-banner-header h3').textContent = `⚠️ ${p.titulo}`;
      alertBanner.querySelector('.alert-banner-header span').textContent = `Emitido em ${p.dataEmissao}`;
      alertBanner.querySelector('p').textContent = p.descricao;
      
      const prazoText = alertBanner.querySelector('.prazo-text');
      if (prazoText) {
        prazoText.innerHTML = `Prazo para reavaliação: <strong>${p.prazo}</strong> —${p.diasRestantes} dias restantes`;
      }
    }

    // Preenche a lista de Encaminhamentos
    const encaminhamentosGrid = document.querySelector('.encaminhamentos-grid');
    if (encaminhamentosGrid && data.encaminhamentos) {
      encaminhamentosAtuais = data.encaminhamentos;
      encaminhamentosGrid.innerHTML = data.encaminhamentos.map((enc, index) => `
        <div class="enc-card border-${enc.cor}">
          <span class="enc-tag">${escapeHtml(enc.especialidade)}</span>
          <h3>${escapeHtml(enc.medico)}</h3>
          <p>${escapeHtml(enc.local)}</p>
          <div class="enc-footer">
            <span class="badge-status-${escapeHtml(enc.cor)}">${escapeHtml(enc.status)}</span>
            <button class="detail-link" type="button" data-detail-index="${index}">Detalhes →</button>
          </div>
        </div>
      `).join('');
    }

  } catch (error) {
    console.error("Erro ao carregar os alertas:", error);
  }
}

const detalhesModal = document.getElementById('detalhesModal');

function fecharDetalhes() {
  detalhesModal?.classList.remove('active');
  detalhesModal?.setAttribute('aria-hidden', 'true');
}

function abrirDetalhes(index) {
  const encaminhamento = encaminhamentosAtuais[index];
  if (!encaminhamento) return;

  document.getElementById('detalhesEspecialidade').textContent = encaminhamento.especialidade || 'ENCAMINHAMENTO';
  document.getElementById('detalhesTitulo').textContent = encaminhamento.medico || 'Detalhes do encaminhamento';
  document.getElementById('detalhesMedico').textContent = encaminhamento.medico || '-';
  document.getElementById('detalhesLocal').textContent = encaminhamento.local || '-';
  document.getElementById('detalhesStatus').textContent = encaminhamento.status || '-';
  document.getElementById('detalhesData').textContent = encaminhamento.data || 'Data não informada';
  detalhesModal?.classList.add('active');
  detalhesModal?.setAttribute('aria-hidden', 'false');
}

document.querySelector('.encaminhamentos-grid')?.addEventListener('click', event => {
  const button = event.target.closest('.detail-link');
  if (button) abrirDetalhes(Number(button.dataset.detailIndex));
});
document.getElementById('btnFecharDetalhes')?.addEventListener('click', fecharDetalhes);
document.getElementById('btnFecharDetalhesRodape')?.addEventListener('click', fecharDetalhes);

document.getElementById('btnVerLaudo')?.addEventListener('click', () => {
  alert('O laudo está disponível para consulta com o ambulatório.');
});

document.getElementById('btnAgendar')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  button.textContent = 'REAVALIAÇÃO SOLICITADA';
  button.disabled = true;
});

// ==========================================
// 4. INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  carregarPerfil();
  carregarAlertas();
  carregarPublicacoes();
  carregarMedicosCredenciados();
});

document.getElementById('btnGoAlerts')?.addEventListener('click', () => switchFuncionarioTab('tab-alertas'));