// Navegação entre Abas
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tabId = item.getAttribute('data-tab');
    navItems.forEach(n => n.classList.remove('active'));
    tabContents.forEach(t => t.classList.remove('active'));
    
    item.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');
  });
});

// Carregar Exames da API
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
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Erro ao carregar exames:", err);
  }
}

// Carregar Médicos Credenciados
async function carregarMedicos() {
  try {
    const res = await fetch('/api/ambulatorio/medicos');
    const medicos = await res.json();
    const grid = document.getElementById('medicosGrid');
    if (!grid) return;

    grid.innerHTML = medicos.map(m => `
      <div class="medico-card">
        <div class="medico-header">
          <div class="medico-avatar">${m.nome.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
          <div>
            <h3>${m.nome}</h3>
            <p class="subtitle">${m.especialidade}</p>
          </div>
          <span class="badge ${m.status === 'Disponível' ? 'badge-green' : 'badge-gray'}">${m.status}</span>
        </div>
        <div class="medico-body">
          <p>CRM/SP ${m.crm}</p>
          <p>${m.telefone}</p>
          <p>${m.email}</p>
        </div>
        <div class="medico-footer">
          <span>Atendimentos: <strong>${m.atendimentos}</strong></span>
          <span class="stars">★ ${m.avaliacao}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Erro ao carregar médicos:", err);
  }
}

// Inicialização
carregarExames();
carregarMedicos();