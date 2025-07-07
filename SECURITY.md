# Sistema de Segurança

## Senha de Segurança

Para proteger operações importantes, o sistema utiliza uma senha de segurança.

### Senha Padrão
- **Senha:** `admin123`

### Operações Protegidas

As seguintes operações requerem confirmação com senha:

1. **Criar Tarefas**
   - Criação de novas tarefas no quadro

2. **Editar Tarefas**
   - Modificação de título, descrição, responsável
   - Alteração de pontos de função e complexidade
   - Mudança de projeto associado

3. **Deletar Tarefas**
   - Remoção definitiva de tarefas

### Configuração da Senha

Para alterar a senha padrão, configure a variável de ambiente:

```bash
# No arquivo .env.local
VITE_SECURITY_PASSWORD=sua_senha_personalizada
```

### Personalização para Deploy

Se você fizer deploy da aplicação, pode definir a senha através das configurações da plataforma:

#### Vercel
1. Vá para Project Settings > Environment Variables
2. Adicione: `VITE_SECURITY_PASSWORD` com sua senha personalizada

#### Netlify
1. Vá para Site Settings > Environment Variables
2. Adicione: `VITE_SECURITY_PASSWORD` com sua senha personalizada

### Dicas de Segurança

- ✅ Use uma senha forte para produção
- ✅ Não commite senhas no repositório
- ✅ Use variáveis de ambiente para diferentes ambientes
- ✅ Mantenha a senha em local seguro

### Solução de Problemas

Se você esqueceu a senha:
1. Verifique o arquivo `.env.local` do projeto
2. Se não houver arquivo, a senha padrão é `admin123`
3. Para ambientes de produção, verifique as variáveis de ambiente da plataforma de deploy 