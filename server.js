const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Erro no SQLite:', err.message);
  else console.log(`Conectado ao SQLite em: ${dbPath}`);
});

function criarHashSenha(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verificarSenha(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  return stored.length === candidate.length && crypto.timingSafeEqual(candidate, stored);
}

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
  if (req.path === '/admin') return res.redirect('/admin/');
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/ambulatorio', (req, res) => {
  if (req.path === '/ambulatorio') return res.redirect('/ambulatorio/');
  res.sendFile(path.join(__dirname, 'public', 'ambulatorio', 'index.html'));
});

app.get('/funcionario', (req, res) => {
  if (req.path === '/funcionario') return res.redirect('/funcionario/');
  res.sendFile(path.join(__dirname, 'public', 'funcionario', 'index.html'));
});

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/ambulatorio', express.static(path.join(__dirname, 'public/ambulatorio')));
app.use('/funcionario', express.static(path.join(__dirname, 'public/funcionario')));

// Banco de Dados SQLite
// Inicialização das Tabelas do Banco de Dados
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      profile TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      matricula TEXT
    )
  `);

  db.get('SELECT COUNT(*) AS total FROM usuarios', [], (err, row) => {
    if (err) {
      console.error('Erro ao verificar usuários:', err.message);
      return;
    }
    if (Number(row?.total) > 0) return;

    const usuarios = [
      ['adm@healthdata.com', 'adm', '1234', null],
      ['amb@healthdata.com', 'amb', '1234', null],
      ['func@healthdata.com', 'fun', '1234', '12345']
    ];
    const insert = db.prepare(`
      INSERT INTO usuarios (username, profile, password_salt, password_hash, matricula)
      VALUES (?, ?, ?, ?, ?)
    `);
    usuarios.forEach(([username, profile, password, matricula]) => {
      const { salt, hash } = criarHashSenha(password);
      insert.run(username, profile, salt, hash, matricula);
    });
    insert.finalize();
  });

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

  db.get('SELECT COUNT(*) AS total FROM publicacoes', [], (err, row) => {
    if (err) {
      console.error('Erro ao verificar publicações:', err.message);
      return;
    }
    if (Number(row?.total) > 0) return;

    const publicacoes = [
      ['Exames Periódicos — Ciclo 2026/2027', 'Consulte o ambulatório para conferir o calendário de exames periódicos.', 'PERIÓDICO', 'Ambulatório HealthData', 'EM ANDAMENTO'],
      ['Saúde e segurança no trabalho', 'Acompanhe as orientações e campanhas publicadas pela equipe de saúde ocupacional.', 'CAMPANHA', 'Equipe HealthData', 'EM ANDAMENTO']
    ];
    const insert = db.prepare(`
      INSERT INTO publicacoes (titulo, descricao, categoria, informacao, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    publicacoes.forEach((item) => insert.run(item));
    insert.finalize();
  });

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
// ROTAS DA API: AUTENTICAÇÃO / LOGIN
// ==========================================
app.post('/api/login', (req, res) => {
  const { username, password, profile } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || typeof profile !== 'string') {
    return res.status(400).json({ success: false, message: 'Informe usuário, senha e perfil.' });
  }

  db.get('SELECT username, profile, password_salt, password_hash FROM usuarios WHERE username = ? AND profile = ?', [username.trim(), profile], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao validar o acesso.' });
    if (!user || !verificarSenha(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'E-mail, senha ou perfil incorretos!' });
    }
    return res.json({ success: true, message: 'Autenticação realizada com sucesso!', profile: user.profile });
  });
});

app.post('/api/alterar-senha', (req, res) => {
  const { username, newPassword } = req.body || {};
  if (typeof username !== 'string' || typeof newPassword !== 'string' || newPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'Informe o usuário e uma senha com pelo menos 4 caracteres.' });
  }

  const { salt, hash } = criarHashSenha(newPassword);
  db.run('UPDATE usuarios SET password_salt = ?, password_hash = ? WHERE username = ?', [salt, hash, username.trim()], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao salvar a nova senha.' });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    return res.json({ success: true, message: 'Senha alterada com sucesso.' });
  });
});

// ==========================================
// ROTAS DA API: AMBULATÓRIO
// ==========================================
app.get('/api/ambulatorio/dashboard', (req, res) => {
  db.get(`
    SELECT
      (SELECT COUNT(*) FROM colaboradores WHERE status = 'Ativo') AS ativos,
      (SELECT COUNT(*) FROM colaboradores WHERE aso_status = 'Vencido') AS asosVencidos,
      (SELECT COUNT(*) FROM colaboradores WHERE aso_status IN ('Vencido', 'A vencer')) +
        (SELECT COUNT(*) FROM exames WHERE resultado IN ('Alterado', 'Em Análise', 'Pendente')) AS alertas,
      (SELECT COUNT(*) FROM exames WHERE strftime('%Y-%m', data) = strftime('%Y-%m', 'now', 'localtime')) AS examesMes,
      (SELECT COUNT(*) FROM exames) AS examesTotal,
      (SELECT COUNT(*) FROM colaboradores WHERE aso_status = 'Em dia') AS asoEmDia,
      (SELECT COUNT(*) FROM colaboradores WHERE aso_status = 'A vencer') AS asoAVencer,
      (SELECT COUNT(*) FROM exames WHERE resultado = 'Normal') AS examesNormais,
      (SELECT COUNT(*) FROM exames WHERE resultado = 'Alterado') AS examesAlterados,
      (SELECT COUNT(*) FROM exames WHERE resultado IN ('Em Análise', 'Pendente')) AS examesPendentes
  `, [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Não foi possível carregar os indicadores.' });
    res.json(row);
  });
});

app.get('/api/ambulatorio/alertas', (req, res) => {
  db.all(`
    SELECT 'ASO' AS tipo, nome AS colaborador, matricula, aso_status AS status,
      proximo_exame AS data, '' AS descricao
    FROM colaboradores
    WHERE aso_status IN ('Vencido', 'A vencer')
    UNION ALL
    SELECT 'Exame' AS tipo, c.nome AS colaborador, c.matricula, e.resultado AS status,
      e.data, e.tipo || CASE WHEN e.observacao IS NOT NULL AND e.observacao != '' THEN ' — ' || e.observacao ELSE '' END AS descricao
    FROM exames e
    JOIN colaboradores c ON c.nome = e.colaborador
    WHERE e.resultado IN ('Alterado', 'Em Análise', 'Pendente')
    ORDER BY data DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Não foi possível carregar os alertas.' });
    res.json(rows);
  });
});

app.get('/api/funcionario/dashboard', (req, res) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Usuário não informado.' });
  db.get(`
    SELECT c.nome, c.proximo_exame, c.aso_status, c.alergias, c.comorbidades,
      (SELECT COUNT(*) FROM exames e WHERE e.colaborador = c.nome) AS exames,
      (SELECT COUNT(*) FROM exames e WHERE e.colaborador = c.nome AND e.resultado IN ('Alterado', 'Em Análise')) AS alertas
    FROM colaboradores c
    JOIN usuarios u ON u.matricula = c.matricula
    WHERE u.username = ? AND u.profile = 'fun'
  `, [username], (err, row) => {
    if (err) return res.status(500).json({ error: 'Não foi possível carregar os indicadores.' });
    if (!row) return res.status(404).json({ error: 'Perfil de funcionário não encontrado.' });
    db.all(`
      SELECT tipo, data, resultado
      FROM exames
      WHERE colaborador = ?
      ORDER BY data DESC
      LIMIT 5
    `, [row.nome], (examsErr, exams) => {
      if (examsErr) return res.status(500).json({ error: 'Não foi possível carregar o histórico de exames.' });
      res.json({ ...row, examesRecentes: exams });
    });
  });
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
  const alergias = (row.alergias || '').split('\n').map(item => item.trim()).filter(Boolean);
  const comorbidades = (row.comorbidades || '').split('\n').map(item => item.trim()).filter(Boolean);

  return {
    nome: row.nome,
    matricula: row.matricula,
    cargo: row.cargo || '-',
    setor: row.setor || '-',
    turno: row.turno || '-',
    status: row.status || '-',
    idade: null,
    tipoSanguineo: row.tipo_sanguineo || '-',
    admissao: row.admissao || '-',
    regime: row.regime || '-',
    alergias,
    comorbidades,
    condicoes: [
      ...alergias.map(desc => ({ tipo: 'Alergia', desc, cor: 'red' })),
      ...comorbidades.map(desc => ({ tipo: 'Comorbidade', desc, cor: 'orange' }))
    ]
  };
}

app.get('/api/funcionario/perfil', (req, res) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Usuário não informado.' });
  db.get(`
    SELECT c.* FROM colaboradores c
    JOIN usuarios u ON u.matricula = c.matricula
    WHERE u.username = ? AND u.profile = 'fun'
  `, [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Perfil de funcionário não encontrado.' });
    res.json(montarPerfil(row));
  });
});

app.put('/api/funcionario/perfil', (req, res) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Usuário não informado.' });
  const alergias = String(req.body?.alergias || '').split('\n').map(item => item.trim()).filter(Boolean).join('\n');
  const comorbidades = String(req.body?.comorbidades || '').split('\n').map(item => item.trim()).filter(Boolean).join('\n');

  db.run(`
    UPDATE colaboradores SET alergias = ?, comorbidades = ?
    WHERE matricula = (SELECT matricula FROM usuarios WHERE username = ? AND profile = 'fun')
  `, [alergias, comorbidades, username], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    db.get(`
      SELECT c.* FROM colaboradores c
      JOIN usuarios u ON u.matricula = c.matricula
      WHERE u.username = ? AND u.profile = 'fun'
    `, [username], (selectErr, row) => {
      if (selectErr) return res.status(500).json({ error: selectErr.message });
      res.json(montarPerfil(row));
    });
  });
});

app.get('/api/funcionario/alertas', (req, res) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Usuário não informado.' });
  db.get(`
    SELECT c.nome FROM colaboradores c
    JOIN usuarios u ON u.matricula = c.matricula
    WHERE u.username = ? AND u.profile = 'fun'
  `, [username], (profileErr, collaborator) => {
    if (profileErr) return res.status(500).json({ error: profileErr.message });
    if (!collaborator) return res.status(404).json({ error: 'Perfil de funcionário não encontrado.' });

    db.all(`
      SELECT tipo, data, resultado, medico, observacao
      FROM exames
      WHERE colaborador = ? AND resultado IN ('Alterado', 'Em Análise', 'Pendente')
      ORDER BY data DESC
    `, [collaborator.nome], (err, exams) => {
      if (err) return res.status(500).json({ error: err.message });
      const pendencia = exams[0];
      res.json({
        pendenciaPrincipal: pendencia ? {
          titulo: `RESULTADO ${pendencia.resultado.toUpperCase()}`,
          descricao: [pendencia.tipo, pendencia.observacao].filter(Boolean).join(' — '),
          dataEmissao: pendencia.data,
          prazo: 'Consulte o ambulatório',
          diasRestantes: null
        } : null,
        encaminhamentos: exams.map(exam => ({
          especialidade: exam.tipo,
          medico: exam.medico || 'Equipe do ambulatório',
          local: 'Ambulatório HealthData',
          status: exam.resultado === 'Alterado' ? 'Acompanhamento recomendado' : 'Resultado pendente',
          data: exam.data,
          cor: 'orange'
        }))
      });
    });
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