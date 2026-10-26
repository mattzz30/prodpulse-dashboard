# Checklist de publicação e privacidade

Este arquivo documenta apenas o pacote demonstrativo, não a base original.

## Alterações aplicadas

- Base JSON nova, sintética e determinística; clientes `Cliente Fictício XX`, códigos `ITEM-FICT-*` e lotes `DEMO-LOTE-*`.
- Marcas, caminhos de integração e referência direta à organização original removidos das fontes distribuídas.
- Fotos, logotipo e vídeos do ZIP original descartados; substituição por logomarca genérica em texto e SVGs ilustrativos.
- Cliente de atualização modificado para ler exclusivamente `demo-data.json` local, com validação dos identificadores sintéticos, sem cache real e sem endpoint configurável.
- Servidor Python com porta livre automática e acesso apenas pelo próprio computador.
- Arquivos duplicados e readmes antigos descartados; arquivo `.bat` acessível apenas no loopback.

## Antes do GitHub/LinkedIn

- [ ] Abrir o ZIP público e verificar os arquivos de novo.
- [ ] Revisar o conteúdo de qualquer nova imagem/screenshot antes de postar (notificações, abas, endereços, nomes e arquivos).
- [ ] Criar um repositório novo e vazio; não transportar histórico Git da versão interna.
- [ ] Conferir direitos autorais, termos de confidencialidade e políticas internas.
- [ ] Nunca reintroduzir dados reais, URLs de fluxo, chaves, nomes de clientes ou materiais internos.

Esta mitigação técnica reduz riscos de identificação; não substitui autorização institucional e revisão de titularidade do código.
