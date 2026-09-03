// ==========================================
// 1. GERENCIAMENTO DE ABAS E NAVEGAÇÃO
// ==========================================
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

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

// ==========================================
// 2. CARREGAR DADOS DO PERFIL DO FUNCIONÁRIO
// ==========================================
async function carregarPerfil() {
  try {
    const response = await fetch('/api/funcionario/perfil');
    if (!response.ok) throw new Error("Erro ao buscar perfil");

    const data = await response.json();

    // Atualiza cabeçalho do perfil
    const profileHeader = document.querySelector('.profile-header');
    if (profileHeader) {
      profileHeader.querySelector('h2').textContent = data.nome;
      profileHeader.querySelector('p').textContent = `${data.cargo} ·${data.setor}`;
      
      const badgeStatus = profileHeader.querySelector('.badge-status-green');
      if (badgeStatus) {
        badgeStatus.textContent = `${data.turno} —${data.status}`;
      }
    }

    // Renderiza a lista de Condições e Restrições na coluna lateral
    const sideCard = document.querySelector('.side-card');
    if (sideCard && data.condicoes) {
      const condicoesHTML = data.condicoes.map(cond => `
        <div class="condition-item ${cond.cor}">
          <strong>${cond.tipo}</strong>
          <p>${cond.desc}</p>
        </div>
      `).join('');

      sideCard.innerHTML = `<h3>CONDIÇÕES E RESTRIÇÕES</h3>` + condicoesHTML;
    }

  } catch (error) {
    console.error("Erro ao carregar o perfil:", error);
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
      encaminhamentosGrid.innerHTML = data.encaminhamentos.map(enc => `
        <div class="enc-card border-${enc.cor}">
          <span class="enc-tag">${enc.especialidade}</span>
          <h3>${enc.medico}</h3>
          <p>${enc.local}</p>
          <div class="enc-footer">
            <span class="badge-status-${enc.cor}">${enc.status}</span>
            <a href="#">Detalhes →</a>
          </div>
        </div>
      `).join('');
    }

  } catch (error) {
    console.error("Erro ao carregar os alertas:", error);
  }
}

// ==========================================
// 4. INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  carregarPerfil();
  carregarAlertas();
});