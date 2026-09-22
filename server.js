const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const dbPath = path.resolve(__dirname, 'database.db');

// Middleware para JSON e URL Encoded
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));

// HABILITAR CORS (Permite requisições do Live Preview)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Lista de utilizadores cadastrados
const USUARIOS_REGISTADOS = [
    { username: 'adm@healthdata.com', password: '1234', profile: 'adm' },
    { username: 'amb@healthdata.com', password: '1234', profile: 'amb' },
    { username: 'func@healthdata.com', password: '1234', profile: 'fun' }
];

// ==========================================
// ROTAS DE TELA (LOGIN E PAINÉIS)
// ==========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/ambulatorio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ambulatorio', 'index.html'));
});

app.get('/funcionario', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'funcionario', 'index.html'));
});

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/ambulatorio', express.static(path.join(__dirname, 'public/ambulatorio')));
app.use('/funcionario', express.static(path.join(__dirname, 'public/funcionario')));

// ==========================================
// ROTA DA API: AUTENTICAÇÃO / LOGIN
// ==========================================
app.post('/api/login', (req, res) => {
    const { username, password, profile } = req.body || {};

    const usuarioValido = USUARIOS_REGISTADOS.find(
        (user) => user.username === username && user.password === password && user.profile === profile
    );

    if (usuarioValido) {
        return res.json({
            success: true,
            message: 'Autenticação realizada com sucesso!',
            profile: usuarioValido.profile
        });
    }

    return res.status(401).json({
        success: false,
        message: 'E-mail, senha ou perfil incorretos!'
    });
});

// Banco de Dados SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Erro no SQLite:", err.message);
  else console.log(`Conectado ao SQLite em: ${dbPath}`);
});

// Inicialização das Tabelas do Banco de Dados
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      matricula TEXT NOT NULL,
      cargo TEXT,
      setor TEXT,
      turno TEXT,
      status TEXT DEFAULT 'Ativo',
      aso_status TEXT DEFAULT 'Em dia',
      admissao TEXT,
      favorito INTEGER DEFAULT 0,
      ultimo_exame TEXT,
      proximo_exame TEXT
    )
  `);

  db.all('PRAGMA table_info(colaboradores)', [], (err, rows) => {
    if (err) {
      console.error('Erro ao verificar schema de colaboradores:', err.message);
      return;
    }

    const existingColumns = new Set((rows || []).map((row) => row.name));
    const extraColumns = [
      { name: 'turno', definition: 'TEXT' },
      { name: 'aso_status', definition: "TEXT DEFAULT 'Em dia'" },
      { name: 'admissao', definition: 'TEXT' },
      { name: 'favorito', definition: 'INTEGER DEFAULT 0' },
      { name: 'alergias', definition: 'TEXT DEFAULT \'\'' },
      { name: 'comorbidades', definition: 'TEXT DEFAULT \'\'' }
    ];

    extraColumns.forEach(({ name, definition }) => {
      if (!existingColumns.has(name)) {
        db.run(`ALTER TABLE colaboradores ADD COLUMN ${name}${definition}`);
      }
    });
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS exames (
      id TEXT PRIMARY KEY,
      colaborador TEXT NOT NULL,
      tipo TEXT NOT NULL,
      data TEXT NOT NULL,
      resultado TEXT DEFAULT 'Normal',
      medico TEXT,
      observacao TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS medicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      especialidade TEXT NOT NULL,
      crm TEXT NOT NULL,
      telefone TEXT,
      email TEXT,
      status TEXT DEFAULT 'Disponível',
      atendimentos INTEGER DEFAULT 0,
      avaliacao REAL DEFAULT 5.0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS publicacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      informacao TEXT,
      status TEXT DEFAULT 'EM ANDAMENTO',
      imagem TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Dados Iniciais (Seed)
  db.get('SELECT COUNT(*) AS total FROM colaboradores', [], (err, row) => {
    if (err) return;
    if (row && Number(row.total) === 0) {
      const seedData = [
        ['Maria Fernandes', '12345', 'Op. de Máquina', 'Linha de Produção 3', 'Turno A', 'Ativo', 'A vencer', '03/2011', 0],
        ['Ana Lima', '12347', 'Analista SST', 'SST', 'Turno B', 'Ativo', 'Vencido', '07/2018', 1],
        ['Felipe Alves', '12350', 'Auxiliar de Manutenção', 'Manutenção', 'Turno C', 'Pendente', 'Em dia', '11/2020', 0],
        ['Carlos Souza', '12352', 'Operador Logístico', 'Logística', 'Turno A', 'Ativo', 'Em dia', '05/2019', 0]
      ];

      const insert = db.prepare(`
        INSERT INTO colaboradores (nome, matricula, cargo, setor, turno, status, aso_status, admissao, favorito)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      seedData.forEach((item) => insert.run(item));
      insert.finalize();
    }
  });

  db.get('SELECT COUNT(*) AS total FROM medicos', [], (err, row) => {
    if (err) return;
    if (row && Number(row.total) === 0) {
      const medicos = [
        ['Dra. Sabrina Fonseca', 'Cardiologia', 'CRM-SP 125486', '(11) 99988-1122', 'sabrina@saude.com', 'Disponível', 18, 4.9],
        ['Dr. André Nogueira', 'Ortopedia', 'CRM-SP 984521', '(11) 98877-4312', 'andre@saude.com', 'Disponível', 25, 4.8],
        ['Dr. Roberto Lima', 'Clínica Médica', 'CRM-SP 774512', '(11) 99712-9901', 'roberto@saude.com', 'Ocupado', 10, 4.7]
      ];

      const insert = db.prepare(`
        INSERT INTO medicos (nome, especialidade, crm, telefone, email, status, atendimentos, avaliacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      medicos.forEach((item) => insert.run(item));
      insert.finalize();
    }
  });

  db.get('SELECT COUNT(*) AS total FROM exames', [], (err, row) => {
    if (err) return;
    if (row && Number(row.total) === 0) {
      const exames = [
        ['EX-1001', 'Maria Fernandes', 'Admissional', '2026-07-15', 'Normal', 'Dra. Sabrina Fonseca', 'Sem restrições'],
        ['EX-1002', 'Ana Lima', 'Periódico', '2026-07-22', 'Alterado', 'Dr. André Nogueira', 'Acompanhamento cardiológico recomendado'],
        ['EX-1003', 'Felipe Alves', 'Retorno', '2026-08-02', 'Em Análise', 'Dr. Roberto Lima', 'Solicitado exame complementar']
      ];

      const insert = db.prepare(`
        INSERT INTO exames (id, colaborador, tipo, data, resultado, medico, observacao)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      exames.forEach((item) => insert.run(item));
      insert.finalize();
    }
  });
});

// ==========================================
// ROTAS DA API: AMBULATÓRIO
// ==========================================
app.get('/api/ambulatorio/dashboard', (req, res) => {
  res.json({ ativos: 148, asosVencidos: 3, alertas: 7, examesMes: 34 });
});

app.get('/api/ambulatorio/exames', (req, res) => {
  db.all('SELECT * FROM exames ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/ambulatorio/exames', (req, res) => {
  const { id, colaborador, tipo, data, resultado, medico, observacao } = req.body;
  const query = `INSERT INTO exames (id, colaborador, tipo, data, resultado, medico, observacao) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [id, colaborador, tipo, data, resultado, medico, observacao], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, colaborador, tipo, data, resultado, medico, observacao });
  });
});

app.put('/api/ambulatorio/exames/:id', (req, res) => {
  const { id } = req.params;
  const { colaborador, tipo, data, resultado, medico, observacao } = req.body;
  const query = `UPDATE exames SET colaborador = ?, tipo = ?, data = ?, resultado = ?, medico = ?, observacao = ? WHERE id = ?`;

  db.run(query, [colaborador, tipo, data, resultado, medico, observacao, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Exame não encontrado' });
    res.json({ id, colaborador, tipo, data, resultado, medico, observacao });
  });
});

app.delete('/api/ambulatorio/exames/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM exames WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Exame não encontrado' });
    res.json({ ok: true, deletedId: id });
  });
});

app.get('/api/ambulatorio/medicos', (req, res) => {
  db.all('SELECT * FROM medicos ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/ambulatorio/medicos', (req, res) => {
  const { nome, especialidade, crm, telefone, email, status } = req.body;
  const query = `INSERT INTO medicos (nome, especialidade, crm, telefone, email, status) VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [nome, especialidade, crm, telefone, email, status || 'Disponível'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});

app.put('/api/ambulatorio/medicos/:id', (req, res) => {
  const { id } = req.params;
  const { nome, especialidade, crm, telefone, email, status, atendimentos, avaliacao } = req.body;
  const query = `UPDATE medicos SET nome = ?, especialidade = ?, crm = ?, telefone = ?, email = ?, status = ?, atendimentos = ?, avaliacao = ? WHERE id = ?`;

  db.run(query, [nome, especialidade, crm, telefone, email, status || 'Disponível', atendimentos || 0, avaliacao || 5.0, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Médico não encontrado' });
    res.json({ id: Number(id), nome, especialidade, crm, telefone, email, status: status || 'Disponível', atendimentos: atendimentos || 0, avaliacao: avaliacao || 5.0 });
  });
});

app.delete('/api/ambulatorio/medicos/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM medicos WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Médico não encontrado' });
    res.json({ ok: true, deletedId: Number(id) });
  });
});

app.get('/api/ambulatorio/colaboradores', (req, res) => {
  db.all('SELECT * FROM colaboradores', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==========================================
// ROTAS DA API: GESTÃO DE COLABORADORES (ADMIN)
// ==========================================
app.get('/api/colaboradores', (req, res) => {
  db.all('SELECT * FROM colaboradores ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/colaboradores/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json(row);
  });
});

app.post('/api/colaboradores', (req, res) => {
  const payload = req.body || {};
  const nome = (payload.nome || '').trim();
  const matricula = (payload.matricula || '').trim();

  if (!nome || !matricula) {
    return res.status(400).json({ error: 'Nome e matrícula são obrigatórios.' });
  }

  const query = `INSERT INTO colaboradores (nome, matricula, cargo, setor, turno, status, aso_status, admissao, favorito) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [nome, matricula, payload.cargo || '', payload.setor || '', payload.turno || '', payload.status || 'Ativo', payload.aso_status || 'Em dia', payload.admissao || '', payload.favorito ? 1 : 0];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM colaboradores WHERE id = ?', [this.lastID], (selectErr, row) => {
      if (selectErr) return res.status(500).json({ error: selectErr.message });
      res.status(201).json(row);
    });
  });
});

app.put('/api/colaboradores/:id', (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};

  const query = `UPDATE colaboradores SET nome = ?, matricula = ?, cargo = ?, setor = ?, turno = ?, status = ?, aso_status = ?, admissao = ?, favorito = ? WHERE id = ?`;
  const values = [(payload.nome || '').trim(), (payload.matricula || '').trim(), payload.cargo || '', payload.setor || '', payload.turno || '', payload.status || 'Ativo', payload.aso_status || 'Em dia', payload.admissao || '', payload.favorito ? 1 : 0, id];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    db.get('SELECT * FROM colaboradores WHERE id = ?', [id], (selectErr, row) => {
      if (selectErr) return res.status(500).json({ error: selectErr.message });
      res.json(row);
    });
  });
});

app.patch('/api/colaboradores/:id/favorito', (req, res) => {
  const { id } = req.params;
  const { favorito } = req.body || {};

  db.run('UPDATE colaboradores SET favorito = ? WHERE id = ?', [favorito ? 1 : 0, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json({ ok: true, favorito: !!favorito });
  });
});

app.delete('/api/colaboradores/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM colaboradores WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json({ ok: true, deletedId: Number(id) });
  });
});

// ==========================================
// ROTAS DA API: FUNCIONÁRIO
// ==========================================
function montarPerfil(row) {
  const alergias = (row?.alergias || 'Penicilina — Reação anafilática confirmada\nAmendoim — Intolerância documentada').split('\n').map(item => item.trim()).filter(Boolean);
  const comorbidades = (row?.comorbidades || '').split('\n').map(item => item.trim()).filter(Boolean);

  return {
    nome: row?.nome || 'Maria Fernandes',
    matricula: row?.matricula || '12345',
    cargo: row?.cargo || 'Op. de Máquina',
    setor: row?.setor || 'Linha de Produção 3',
    turno: row?.turno || 'Turno A',
    status: row?.status || 'Ativo',
    idade: 62,
    tipoSanguineo: 'O+',
    admissao: row?.admissao || '03/2011',
    regime: 'CLT - Integral',
    alergias,
    comorbidades,
    condicoes: [
      ...alergias.map(desc => ({ tipo: 'Alergia', desc, cor: 'red' })),
      ...comorbidades.map(desc => ({ tipo: 'Comorbidade', desc, cor: 'orange' })),
      { tipo: 'PCD', desc: 'Mobilidade — Laudo INSS — Portaria 2024', cor: 'teal' },
      { tipo: 'Doadora', desc: 'Doadora de Sangue — Tipo O+ - Última doação 04/2026', cor: 'orange' }
    ]
  };
}

app.get('/api/funcionario/perfil', (req, res) => {
  db.get('SELECT * FROM colaboradores WHERE id = 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(montarPerfil(row));
  });
});

app.put('/api/funcionario/perfil', (req, res) => {
  const alergias = String(req.body?.alergias || '').split('\n').map(item => item.trim()).filter(Boolean).join('\n');
  const comorbidades = String(req.body?.comorbidades || '').split('\n').map(item => item.trim()).filter(Boolean).join('\n');

  db.run('UPDATE colaboradores SET alergias = ?, comorbidades = ? WHERE id = 1', [alergias, comorbidades], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    db.get('SELECT * FROM colaboradores WHERE id = 1', [], (selectErr, row) => {
      if (selectErr) return res.status(500).json({ error: selectErr.message });
      res.json(montarPerfil(row));
    });
  });
});

app.get('/api/funcionario/alertas', (req, res) => {
  res.json({
    pendenciaPrincipal: {
      titulo: "ASO PENDENTE DE REAVALIAÇÃO",
      descricao: "Exame de colesterol total fora da faixa de referência — resultado 240 mg/dL (referência até 200 mg/dL), coletado em 22/07/2026. O serviço médico recomenda reavaliação com cardiologista e repetição do exame em 30 dias.",
      dataEmissao: "22/07/2026",
      prazo: "22/08/2026",
      diasRestantes: 16
    },
    encaminhamentos: [
      { especialidade: "CLÍNICO GERAL", medico: "Dra. Ana Costa", local: "Ambulatório da Planta — Bloco C", status: "Consulta agendada", data: "12/08/2026 · 14h30", cor: "teal" },
      { especialidade: "CARDIOLOGIA", medico: "Dr. Ricardo Melo", local: "Rede credenciada SESI — Unidade Centro", status: "Aguardando agendamento", data: "Prazo: 22/08/2026", cor: "orange" },
      { especialidade: "FISIOTERAPIA", medico: "Ft. Carla Souza", local: "Ambulatório da Planta — Bloco C", status: "Em tratamento", data: "3 sessões realizadas", cor: "teal" },
      { especialidade: "EXAME LABORATORIAL", medico: "Perfil Lipídico Completo", local: "Laboratório Central — Bloco A", status: "Solicitado", data: "Prazo: 30/08/2026", cor: "orange" }
    ]
  });
});

// ==========================================
// ROTAS DA API: PUBLICAÇÕES
// ==========================================
app.get('/api/ambulatorio/publicacoes', (req, res) => {
  db.all('SELECT * FROM publicacoes ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/ambulatorio/publicacoes', (req, res) => {
  const payload = req.body || {};
  const titulo = (payload.titulo || '').trim();
  const descricao = (payload.descricao || '').trim();
  const categoria = (payload.categoria || '').trim();

  if (!titulo || !descricao || !categoria) {
    return res.status(400).json({ error: 'Título, descrição e categoria são obrigatórios.' });
  }

  const query = `INSERT INTO publicacoes (titulo, descricao, categoria, informacao, status, imagem) VALUES (?, ?, ?, ?, ?, ?)`;
  const values = [titulo, descricao, categoria, (payload.informacao || '').trim(), payload.status || 'EM ANDAMENTO', payload.imagem || ''];

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM publicacoes WHERE id = ?', [this.lastID], (selectErr, row) => {
      if (selectErr) return res.status(500).json({ error: selectErr.message });
      res.status(201).json(row);
    });
  });
});

// Inicialização do Servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`- Login: http://localhost:${PORT}/login`);
  console.log(`- Admin: http://localhost:${PORT}/admin`);
  console.log(`- Ambulatório: http://localhost:${PORT}/ambulatorio`);
  console.log(`- Funcionário: http://localhost:${PORT}/funcionario`);
});