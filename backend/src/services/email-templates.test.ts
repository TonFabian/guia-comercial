import { describe, expect, it } from 'vitest';

import { buildPlanEmail } from './email-templates.js';

describe('buildPlanEmail — layout com marca', () => {
  const base = {
    ownerName: 'Mariana Alves',
    companyName: 'Doceria da Mariana',
    planLabel: 'Premium',
    expiresAt: '07/12/2026',
    ctaHref: 'https://guiacomercial.com.br',
  };

  it('D-7: fala em "vence em 7 dias" e mostra a data', () => {
    const html = buildPlanEmail('expiring-7d', base);
    expect(html).toContain('vence em <strong>7 dias</strong>');
    expect(html).toContain('07/12/2026');
    expect(html).toContain('Olá, <strong>Mariana Alves</strong>');
    expect(html).toContain('Guia Comercial');
  });

  it('D-7 premium: lista os benefícios que a renovação mantém', () => {
    const html = buildPlanEmail('expiring-7d', base);
    expect(html).toContain('continua com');
    expect(html).toContain('Destaque na tela inicial');
    expect(html).toContain('Desempenho dos últimos 30 dias');
    expect(html).toContain('Prioridade na busca');
  });

  it('D-7 básico: lista os benefícios do plano básico (sem itens de premium)', () => {
    const html = buildPlanEmail('expiring-7d', { ...base, planLabel: 'Básico' });
    expect(html).toContain('Galeria de fotos');
    expect(html).toContain('Promoções');
    expect(html).not.toContain('Desempenho dos últimos 30 dias');
  });

  it('D-1: fala em "vence amanhã"', () => {
    const html = buildPlanEmail('expiring-1d', base);
    expect(html).toContain('vence <strong>amanhã</strong>');
  });

  it('expired: fala em "expirou" e rebaixamento, e lista o que a renovação recupera', () => {
    const html = buildPlanEmail('expired', base);
    expect(html).toContain('expirou');
    expect(html).toContain('formato gratuito');
    expect(html).toContain('Ao renovar, você volta a ter');
    expect(html).toContain('Selo verificado');
  });

  it('tem botão de ação com o link informado', () => {
    const html = buildPlanEmail('expiring-7d', base);
    expect(html).toContain('href="https://guiacomercial.com.br"');
    expect(html).toContain('Falar com a equipe');
  });

  it('escapa HTML do nome do dono e da empresa (dados de usuário)', () => {
    const html = buildPlanEmail('expiring-7d', {
      ...base,
      ownerName: 'Mariana <script>alert(1)</script>',
      companyName: 'Loja & Filhos <img src=x onerror=hack()>',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('Loja &amp; Filhos');
  });

  it('é um documento HTML completo (doctype, head, table para clientes de e-mail)', () => {
    const html = buildPlanEmail('expiring-7d', base);
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain('<table');
    expect(html).toContain('#FFC107');
    expect(html).toContain('#121212');
  });

  it('rodapé tem divisor visível mas leve (não escuro como o primeiro draft)', () => {
    const html = buildPlanEmail('expiring-7d', base);
    expect(html).toContain('border-top:1px solid #D4D4D8');
    expect(html).not.toContain('#2E2E2E');
  });
});
