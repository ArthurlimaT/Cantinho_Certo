# Cantinho_Certo

Guia prático e acolhedor para quem está encarando a primeira mudança e a organização de apartamentos pequenos.

Construído com **Astro**, preservando 100% da identidade visual afetiva, acessibilidade (WCAG 2.2 AA) e interatividade com persistência local.

---

## Como Executar o Projeto

### 1. Modo de Desenvolvimento (com recarregamento automático)
No terminal da pasta do projeto, execute:
```bash
npm run dev
```
O site estará disponível em: `http://localhost:4321`

### 2. Gerar Versão de Produção (Build Estático Otimizado)
```bash
npm run build
```
O Astro gerará a pasta `dist/` com HTML puro, CSS minificado e scripts otimizados, pronta para deploy gratuito na **Vercel**, **Netlify**, **Cloudflare Pages** ou **GitHub Pages**.

### 3. Visualizar a Versão de Produção Localmente
```bash
npm run preview
```

---

## Estrutura do Projeto (Astro)

```text
cantinhoCerto/
├── astro.config.mjs         # Configurações do Astro
├── package.json             # Dependências e scripts (dev, build, preview)
├── public/                  # Arquivos estáticos servidos diretamente
│   ├── favicon.svg          # Ícone da marca
│   ├── hero-botanical.svg   # Ilustração decorativa do início
│   ├── og-image.png         # Prévia para compartilhamento
│   └── js/                  # Módulos JavaScript (storage, theme, checklist, floorplan, etc.)
├── src/
│   ├── layouts/
│   │   └── Layout.astro     # Layout base com Header, Navbar, Plantinha e Footer
│   ├── pages/
│   │   └── index.astro      # Página principal com todas as seções e navegação
│   └── styles/              # Design System em CSS
│       ├── variables.css    # Paleta linho, grafite, sálvia, terracota e temas claro/escuro
│       ├── base.css         # Reset, tipografia Nunito e foco acessível (A1)
│       ├── components.css   # Botões, checklists nativos, cards e newsletter
│       └── floorplan.css    # Planta baixa interativa SVG e painel de dicas
└── dist/                    # Pasta de saída após o comando `npm run build`
```

---

## Funcionalidades Preservadas

* **Progresso da mudança:** Barra acessível que combina etapas concluídas e tarefas marcadas.
* **Detalhes botânicos:** Ilustração sutil no início e na seção sobre o projeto.
* **Planta Baixa Interativa SVG:** Seleção de cômodos (Sala, Quarto, Cozinha, Banheiro) com dicas de vistoria e navegação completa por teclado.
* **Checklists Nativos & Acessíveis:** `<input type="checkbox">` com persistência segura no `localStorage` e suporte a mouse, toque e teclado.
* **Modo Claro / Escuro:** Alternância manual persistente com sincronização automática do `prefers-color-scheme`.
* **Newsletter Validada:** Envio assíncrono com feedback de carregamento, sucesso e erro, e suporte a endpoint configurável (`window.CANTINHO_NEWSLETTER_ENDPOINT`).
* **Acessibilidade WCAG 2.2 AA:** Anel de foco terracota, skip link, anúncios via `aria-live` e hierarquia de títulos semântica.
* **Guia de visita imprimível:** Checklist com composição otimizada para impressão em folha A4.
* **Prévia de compartilhamento:** Metadados Open Graph e Twitter com imagem social em alta resolução.
