# Trello Clone Board View

Um clone moderno do Trello com interface de quadro construído com React, TypeScript e Supabase.

## 🚀 Funcionalidades

- ✅ Gerenciamento de tarefas com drag and drop
- ✅ Colaboração em tempo real
- ✅ Autenticação de usuários
- ✅ Gerenciamento de projetos
- ✅ Sistema de pontos de usuário
- ✅ Rastreamento de atividades
- ✅ Comentários nas tarefas
- ✅ Sistema de etiquetas
- ✅ Design responsivo

## 🛠️ Tecnologias

- React 18
- TypeScript
- Vite
- Supabase
- Tailwind CSS
- shadcn/ui
- React Query
- React Hook Form

## 🎯 Como Usar

### Pré-requisitos

- Node.js (v18 ou superior)
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/evosoftwares/trello-clone-board-view.git
cd trello-clone-board-view
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

4. Abra [http://localhost:8080](http://localhost:8080) no seu navegador.

## 🔐 Senha de Segurança

Para editar tarefas, você precisará da senha de segurança:

**Senha padrão:** `admin123`

Esta senha é solicitada para confirmar operações importantes como:
- Criar tarefas
- Editar tarefas
- Deletar tarefas

## 📁 Estrutura do Projeto

```
src/
├── components/     # Componentes React
├── hooks/         # Custom React hooks
├── lib/           # Bibliotecas utilitárias
├── pages/         # Componentes de página
├── types/         # Definições de tipos TypeScript
└── utils/         # Funções utilitárias
```

## 🚀 Deploy

O projeto está configurado para deploy automático no Vercel e Netlify.

### Vercel (Recomendado)
1. Acesse [vercel.com](https://vercel.com)
2. Conecte seu repositório GitHub
3. Deploy automático!

### Netlify
1. Acesse [netlify.com](https://netlify.com)
2. Conecte seu repositório GitHub
3. Deploy automático!

## 📄 Build para Produção

Para fazer build da aplicação para produção:

```bash
npm run build
```

Os arquivos de build ficarão no diretório `dist`.

## 🤝 Contribuindo

1. Faça um fork do repositório
2. Crie sua branch de feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT.
