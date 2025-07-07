# Deploy do Trello Clone

## Opções de Deploy

### 1. Vercel (Recomendado)

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em "New Project"
3. Selecione o repositório `trello-clone-board-view`
4. O Vercel detectará automaticamente que é um projeto Vite
5. Clique em "Deploy"

A aplicação será deployada automaticamente e você receberá um URL para acesso.

### 2. Netlify

1. Acesse [netlify.com](https://netlify.com) e faça login
2. Clique em "New site from Git"
3. Conecte sua conta GitHub
4. Selecione o repositório `trello-clone-board-view`
5. As configurações serão detectadas automaticamente pelo arquivo `netlify.toml`
6. Clique em "Deploy site"

### 3. Deploy Manual Local

Para testar localmente:

```bash
# Instalar dependências
npm install

# Fazer build
npm run build

# Servir a aplicação
npm run preview
```

## Configurações Incluídas

✅ **vercel.json** - Configuração do Vercel  
✅ **netlify.toml** - Configuração do Netlify  
✅ **Build otimizado** - Aplicação pronta para produção  
✅ **Supabase configurado** - Banco de dados em produção  

## URLs de Deploy

Após o deploy, você terá:
- URL da aplicação para acesso público
- Deploy automático a cada push no branch main
- Preview de branches para testes

## Monitoramento

Com o deploy feito, você pode:
- Acompanhar logs em tempo real
- Ver métricas de performance
- Configurar domínio personalizado
- Configurar variáveis de ambiente 