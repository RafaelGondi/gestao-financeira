# Backlog

## ✅ Concluído

- [x] Evolução mensal — gráfico de barras + linha com receitas, despesas e saldo dos últimos 12 meses
- [x] Comparação mês a mês por categoria — com sparkline de tendência e filtro "só comparáveis"
- [x] Notas/observações em transações — campo livre para anotações (ex: "reembolso pendente", "dividido com fulano")
- [x] Nome na fatura — segundo campo de descrição para reconciliar com extrato do banco/cartão
- [x] Limite global de gastos — teto fixo ou meta de poupança (% da receita), com histórico preservado
- [x] Análise de orçamento — acompanhamento do mês atual vs limite global, com ritmo de gasto e saldo disponível

---

## 🚧 A desenvolver

### Análises
- [ ] Projeção do mês atual — requer IA para identificar padrões e comparar com períodos equivalentes; extrapolação linear simples não é suficiente

### Transações
- [x] Busca global — modal flutuante com debounce, busca em descrição e nome na fatura, highlight do termo

### UX
- [x] Atalho de busca — `/` abre a busca global quando fora de inputs, `Ctrl+K` / `Cmd+K` abre sempre
- [ ] Atalhos de teclado — `N` nova transação, `Esc` fechar modais
- [ ] Confirmação antes de sair de formulário com dados preenchidos
- [ ] Undo após deletar — toast com botão "Desfazer" por ~5 segundos

### Funcionalidades maiores
- [x] Metas de economia — criação com ícone/cor, aportes manuais, progresso, ritmo médio e previsão de conclusão
- [ ] Importação de OFX/CSV — importar extrato do banco automaticamente

### Requer infra (fora do escopo local)
- [ ] PWA — instalar no celular como app, funcionar offline para consulta (precisa de HTTPS + servidor remoto)
