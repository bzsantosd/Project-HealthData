const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve as duas aplicações de forma totalmente independente
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/ambulatorio', express.static(path.join(__dirname, 'public/ambulatorio')));

// Redireciona a raiz para o ambulatório por padrão
app.get('/', (req, res) => res.redirect('/ambulatorio'));

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) console.error("Erro no SQLite:", err.message);
  else console.log("Conectado ao SQLite.");
});

// Inicialização das Tabelas do Banco de Dados
db.serialize(() => {
  // Tabela de Colaboradores (Compartilhada)
  db.run(`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      matricula TEXT NOT NULL,
      cargo TEXT,
      setor TEXT,
      status TEXT DEFAULT 'Ativo',
      ultimo_exame TEXT,
      proximo_exame TEXT
    )
  `);

  // Tabela de Exames (Exclusivo Ambulatório)
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

  // Tabela de Médicos Credenciados (Exclusivo Ambulatório)
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
});

// ==========================================
// ROTAS DA API: AMBULATÓRIO
// ==========================================

// Dashboard: Estatísticas
app.get('/api/ambulatorio/dashboard', (req, res) => {
  const stats = { ativos: 148, asosVencidos: 3, alertas: 7, examesMes: 34 };
  res.json(stats);
});

// Exames: Listar todos
app.get('/api/ambulatorio/exames', (req, res) => {
  db.all('SELECT * FROM exames ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Exames: Criar novo exame
app.post('/api/ambulatorio/exames', (req, res) => {
  const { id, colaborador, tipo, data, resultado, medico, observacao } = req.body;
  const query = `INSERT INTO exames (id, colaborador, tipo, data, resultado, medico, observacao) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [id, colaborador, tipo, data, resultado, medico, observacao], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, colaborador, tipo, data, resultado, medico, observacao });
  });
});

// Médicos: Listar todos
app.get('/api/ambulatorio/medicos', (req, res) => {
  db.all('SELECT * FROM medicos ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Médicos: Cadastrar médico
app.post('/api/ambulatorio/medicos', (req, res) => {
  const { nome, especialidade, crm, telefone, email, status } = req.body;
  const query = `INSERT INTO medicos (nome, especialidade, crm, telefone, email, status) VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [nome, especialidade, crm, telefone, email, status || 'Disponível'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});

// Colaboradores (Leitura para a tabela do ambulatório)
app.get('/api/ambulatorio/colaboradores', (req, res) => {
  db.all('SELECT * FROM colaboradores', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`- Admin: http://localhost:${PORT}/admin`);
  console.log(`- Ambulatório: http://localhost:${PORT}/ambulatorio`);
});

// Servir a pasta do funcionário
app.use('/funcionario', express.static(path.join(__dirname, 'public/funcionario')));

// API: Dados do Perfil do Funcionário Logado (Exemplo: Maria Fernandes - ID 1)
app.get('/api/funcionario/perfil', (req, res) => {
  const perfil = {
    nome: "Maria Fernandes",
    matricula: "12345",
    cargo: "Op. de Máquina",
    setor: "Linha de Produção 3",
    turno: "Turno A",
    status: "Ativo",
    idade: 62,
    tipoSanguineo: "O+",
    admissao: "03/2011",
    regime: "CLT - Integral",
    condicoes: [
      { tipo: "Alergia", desc: "Penicilina — Reação anafilática confirmada", cor: "red" },
      { tipo: "Alergia", desc: "Amendoim — Intolerância documentada", cor: "red" },
      { tipo: "PCD", desc: "Mobilidade — Laudo INSS — Portaria 2024", cor: "teal" },
      { tipo: "Doadora", desc: "Doadora de Sangue — Tipo O+ - Última doação 04/2026", cor: "orange" }
    ]
  };
  res.json(perfil);
});

// API: Alertas e Encaminhamentos
app.get('/api/funcionario/alertas', (req, res) => {
  const alertas = {
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
  };
  res.json(alertas);
});