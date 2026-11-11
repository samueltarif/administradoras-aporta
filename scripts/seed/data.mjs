// Dados FICTÍCIOS de demonstração. Nenhum nome, documento ou contato real.
export const USERS = [
  { key: 'owner', email: 'dono@demo.example.com', name: 'Dono (Demo)', env: 'DEMO_PASSWORD_OWNER', staff: 'owner' },
  { key: 'ops', email: 'operacoes@demo.example.com', name: 'Operações (Demo)', env: 'DEMO_PASSWORD_OPERATIONS', staff: 'operations' },
  { key: 'mgrAlfa', email: 'gestora.alfa@demo.example.com', name: 'Gestora Alfa (Demo)', env: 'DEMO_PASSWORD_MANAGER_ALFA', mgmt: ['alfa', 'manager'] },
  { key: 'mgrBeta', email: 'gestora.beta@demo.example.com', name: 'Gestora Beta (Demo)', env: 'DEMO_PASSWORD_MANAGER_BETA', mgmt: ['beta', 'manager'] },
  { key: 'attAlfa', email: 'atendente.alfa@demo.example.com', name: 'Atendente Alfa (Demo)', env: 'DEMO_PASSWORD_ATTENDANT_ALFA', mgmt: ['alfa', 'attendant'] },
  { key: 'syndic', email: 'sindico.jardins@demo.example.com', name: 'Síndico Jardins (Demo)', env: 'DEMO_PASSWORD_SYNDIC', cust: ['jardins', 'syndic'] },
  { key: 'porter', email: 'porteiro.jardins@demo.example.com', name: 'Porteiro Jardins (Demo)', env: 'DEMO_PASSWORD_PORTER', cust: ['jardins', 'porter'] },
  { key: 'indep', email: 'sindico.avulso@demo.example.com', name: 'Síndico Avulso (Demo)', env: 'DEMO_PASSWORD_INDEPENDENT', cust: ['avulso', 'syndic'] },
]

export const COMPANIES = [
  { key: 'alfa', trade_name: 'Administradora Alfa (Demo)', legal_name: 'Alfa Gestão Condominial Ltda (fictícia)', email: 'contato@alfa.demo.example.com' },
  { key: 'beta', trade_name: 'Administradora Beta (Demo)', legal_name: 'Beta Administração de Imóveis Ltda (fictícia)', email: 'contato@beta.demo.example.com' },
  { key: 'gama', trade_name: 'Administradora Gama (Demo)', legal_name: 'Gama Serviços Condominiais Ltda (fictícia)', email: 'contato@gama.demo.example.com' },
]

// 12 clientes: 9 com administradora e 3 sem.
export const CUSTOMERS = [
  { key: 'jardins', trade_name: 'Condomínio Residencial Jardins (Demo)', kind: 'condominium', mgmt: 'alfa' },
  { key: 'ipes', trade_name: 'Condomínio Edifício Ipês (Demo)', kind: 'condominium', mgmt: 'alfa' },
  { key: 'aurora', trade_name: 'Condomínio Aurora (Demo)', kind: 'condominium', mgmt: 'alfa' },
  { key: 'portal', trade_name: 'Condomínio Portal do Sol (Demo)', kind: 'condominium', mgmt: 'alfa' },
  { key: 'torre', trade_name: 'Condomínio Torre Azul (Demo)', kind: 'condominium', mgmt: 'beta' },
  { key: 'mirante', trade_name: 'Condomínio Mirante (Demo)', kind: 'condominium', mgmt: 'beta' },
  { key: 'galpao', trade_name: 'Centro Logístico Norte (Demo)', kind: 'business', mgmt: 'beta' },
  { key: 'parque', trade_name: 'Condomínio Parque das Flores (Demo)', kind: 'condominium', mgmt: 'gama' },
  { key: 'colinas', trade_name: 'Condomínio Colinas (Demo)', kind: 'condominium', mgmt: 'gama' },
  { key: 'avulso', trade_name: 'Condomínio Vila Avulsa (Demo)', kind: 'condominium', mgmt: null },
  { key: 'padaria', trade_name: 'Padaria Bom Dia (Demo)', kind: 'business', mgmt: null },
  { key: 'casa', trade_name: 'Residência Particular (Demo)', kind: 'unclassified', mgmt: null },
]

export const CONTRACTS = [
  { key: 'k1', customer: 'jardins', by: 'alfa', title: 'Manutenção mensal de portões', freq: 'monthly', status: 'active', value: 890 },
  { key: 'k2', customer: 'ipes', by: null, title: 'Manutenção preventiva trimestral', freq: 'quarterly', status: 'active', value: 640 },
  { key: 'k3', customer: 'aurora', by: 'alfa', title: 'Automatizadores e motores', freq: 'monthly', status: 'suspended', value: 720 },
  { key: 'k4', customer: 'torre', by: 'beta', title: 'Manutenção mensal completa', freq: 'monthly', status: 'active', value: 1150 },
  { key: 'k5', customer: 'mirante', by: null, title: 'Serralheria e pintura anual', freq: 'annual', status: 'closed', value: 300 },
  { key: 'k6', customer: 'parque', by: 'gama', title: 'Manutenção bimestral', freq: 'bimonthly', status: 'active', value: 560 },
  { key: 'k7', customer: 'avulso', by: null, title: 'Portão social e garagem', freq: 'monthly', status: 'active', value: 480 },
  { key: 'k8', customer: 'galpao', by: 'beta', title: 'Portões industriais', freq: 'monthly', status: 'draft', value: 1900 },
]

const T = (customer, by, title, category, priority, status, daysAgo) => ({ customer, by, title, category, priority, status, daysAgo })
export const TICKETS = [
  T('jardins', 'syndic', 'Portão da garagem não fecha', 'gate_stuck', 'high', 'in_progress', 2),
  T('jardins', 'porter', 'Controle remoto não aciona o portão', 'automation', 'normal', 'open', 1),
  T('jardins', 'porter', 'Barulho no motor do portão social', 'automation', 'normal', 'scheduled', 5),
  T('jardins', 'syndic', 'Pintura do gradil da entrada', 'repaint', 'low', 'waiting_customer', 12),
  T('jardins', 'mgrAlfa', 'Manutenção preventiva de novembro', 'preventive', 'normal', 'resolved', 20),
  T('ipes', 'mgrAlfa', 'Fechadura do portão de pedestres', 'repair', 'high', 'review', 3),
  T('ipes', 'attAlfa', 'Trilho do portão desalinhado', 'repair', 'normal', 'waiting_material', 8),
  T('aurora', 'mgrAlfa', 'Portão travado com moradores dentro', 'gate_stuck', 'emergency', 'open', 0),
  T('aurora', 'attAlfa', 'Solda no portão basculante', 'metalwork', 'normal', 'closed', 30),
  T('portal', 'mgrAlfa', 'Sensor anti-esmagamento', 'automation', 'high', 'in_progress', 4),
  T('torre', 'mgrBeta', 'Portão abre sozinho à noite', 'automation', 'high', 'open', 1),
  T('torre', 'mgrBeta', 'Revisão semestral', 'preventive', 'normal', 'scheduled', 6),
  T('torre', 'mgrBeta', 'Corrente do motor rompida', 'repair', 'emergency', 'resolved', 9),
  T('mirante', 'mgrBeta', 'Grade da piscina solta', 'metalwork', 'normal', 'cancelled', 25),
  T('mirante', 'mgrBeta', 'Repintura de portões', 'repaint', 'low', 'open', 2),
  T('galpao', 'mgrBeta', 'Portão de doca empenado', 'repair', 'high', 'review', 3),
  T('parque', 'ops', 'Vistoria pós-chuva', 'preventive', 'normal', 'open', 1),
  T('parque', 'ops', 'Troca de roldanas', 'repair', 'normal', 'in_progress', 7),
  T('colinas', 'ops', 'Orçamento de novo portão', 'other', 'low', 'waiting_customer', 15),
  T('avulso', 'indep', 'Portão social arrastando no chão', 'repair', 'normal', 'open', 1),
  T('avulso', 'indep', 'Interfone do portão sem áudio', 'other', 'normal', 'scheduled', 4),
  T('avulso', 'indep', 'Manutenção mensal de outubro', 'preventive', 'normal', 'closed', 35),
  T('padaria', 'ops', 'Porta de enrolar travada', 'gate_stuck', 'high', 'resolved', 10),
  T('casa', 'ops', 'Portão eletrônico residencial', 'automation', 'normal', 'open', 2),
  T('jardins', 'syndic', 'Lubrificação das dobradiças', 'preventive', 'low', 'closed', 40),
]

export const VISITS = [
  { customer: 'jardins', contract: 'k1', ticket: 2, title: 'Visita técnica — motor portão social', inDays: 1, status: 'scheduled' },
  { customer: 'jardins', contract: 'k1', title: 'Preventiva mensal Jardins', inDays: 10, status: 'scheduled' },
  { customer: 'ipes', contract: 'k2', title: 'Preventiva trimestral Ipês', inDays: 15, status: 'scheduled' },
  { customer: 'torre', contract: 'k4', ticket: 11, title: 'Revisão semestral Torre Azul', inDays: 2, status: 'scheduled' },
  { customer: 'parque', contract: 'k6', ticket: 17, title: 'Troca de roldanas', inDays: -1, status: 'in_progress' },
  { customer: 'avulso', contract: 'k7', ticket: 20, title: 'Interfone do portão', inDays: 3, status: 'scheduled' },
  { customer: 'padaria', ticket: 22, title: 'Desbloqueio porta de enrolar', inDays: -9, status: 'completed' },
  { customer: 'torre', contract: 'k4', ticket: 12, title: 'Troca de corrente', inDays: -8, status: 'completed' },
]
