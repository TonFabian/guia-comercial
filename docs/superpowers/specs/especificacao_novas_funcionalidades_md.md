## 🏪 1. Seção "Outras Empresas" (Listagem Gratuita)

* **Onde Adicionar:** Na `HomeScreen`, posicionada **logo abaixo das Empresas em Destaque**.
* **Objetivo:** Oferecer visibilidade aos comércios cadastrados no plano gratuito sem tirar o protagonismo dos parceiros pagantes.
* **Layout & Visual:**
  * **Título da Seção:** `"Outras Empresas & Serviços Locais"` com um botão sutil `"Ver todas >"`.
  * **Formato:** Lista vertical de cards compactos em linha (estilo *list item*).
  * **Elementos do Card:**
    * Miniatura da logo/ícone da categoria (tamanho reduzido, ~40x40px).
    * Nome da empresa em Bold (14px).
    * Categoria + Bairro/Endereço em texto secundário cinza.
    * Botão de ação rápida à direita: Ícone discreto de **WhatsApp** ou **ChevronRight** para navegar até a `CompanyDetailScreen`.
  * **Diferenciação:** NÃO deve conter a badge amarela `"Destaque"` nem a galeria expansível de mídias na visualização rápida da Home.

---

## 📢 3. Mural de Avisos Úteis & Utilidade Pública

* **Onde Adicionar:** Na `HomeScreen`, posicionada entre os *Telefones Úteis* e as *Oportunidades na Cidade*.
* **Objetivo:** Centralizar informações essenciais da cidade (vacinação no Hospital Nilo Lima, notas da Equatorial, cronograma da coleta de lixo, etc.).
* **Layout & Visual:**
  * **Título da Seção:** 📢 `"Avisos & Comunicados Locais"`.
  * **Formato:** Carrossel horizontal de cards informativos.
  * **Estilo do Card:** Fundo escuro `#1E1E1E` com uma borda lateral vertical colorida (Amarelo para Geral, Vermelho para Alerta/Urgente, Verde para Saúde).
  * **Interação:** Ao clicar no aviso, abre-se uma modal com o texto completo do comunicado.

---

## 🧰 4. Guia de Profissionais Autônomos

* **Onde Adicionar:** 
  1. Como chip de filtro na barra de categorias: `[ 🧰 Autônomos ]`.
  2. Como seção dedicada na Home: `"Profissionais Independentes"`.
* **Objetivo:** Indexar prestadores de serviços sem estabelecimento físico (eletricistas, pedreiros, encanadores, pintores, manicures, etc.).
* **Layout & Visual:**
  * Cards compactos com foto de perfil circular do profissional, nome, especialidade e o botão principal **💬 Contatar via WhatsApp**.

---

## 🔗 5. Botão de Compartilhar Empresa (Growth Orgânico)

* **Onde Adicionar:** No topo da tela de detalhes da empresa (`CompanyDetailScreen`).
* **Posicionamento:** Header superior direito, ao lado do botão de Favoritar (coração).
* **Funcionalidade:**
  * Utilizar a API nativa `Share.share` do React Native.
  * Mensagem enviada via WhatsApp/Redes:  
    > *"Confira [Nome da Empresa] no aplicativo Guia de Castelo do Piauí! Acesse contatos e serviços aqui: [Link/DeepLink]"*

---

## 📋 Resumo da Nova Hierarquia da HomeScreen

1. **Header / Localização**
2. **Barra de Pesquisa**
3. **Banner Informativo (Convidado)**
4. **Categorias Rápidas** *(sem Transporte Público)*
5. **⭐ Empresas em Destaque** *(Patrocinadores / Cards Grandes)*
6. **🏪 Outras Empresas** *(Listagem Gratuita / Cards Compactos)*
7. **🔥 Promoções da Semana / Banners**
8. **📞 Telefones Úteis & Serviços**
9. **📢 Mural de Avisos Úteis**
10. **🧰 Profissionais Autônomos**
11. **💼 Oportunidades na Cidade (Vagas de Emprego)**
12. **Rodapé (Anuncie Conosco)**
