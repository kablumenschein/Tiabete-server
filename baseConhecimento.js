// BASE DE CONHECIMENTO — SEGURANÇA: isso mora só aqui no servidor, nunca é enviado
// pelo navegador. Antes, o glicbot.js mandava esse texto como "contexto" a cada
// chamada, o que significava que qualquer pessoa com o DevTools aberto podia
// substituir o conteúdo confiável por qualquer texto e o modelo trataria como
// verdade. Agora o cliente manda só a pergunta; o servidor decide o contexto.
//
// SEPARADO do server.js de propósito (set/2026): atualizar a FAQ deve ser uma
// mudança de CONTEÚDO, nunca de código — esse arquivo só tem dados, nenhuma
// lógica. Quem mexe na base não precisa entender o resto do servidor.
//
// REGRA DAS palavrasChave: sempre palavras ou frases INTEIRAS, nunca um pedaço
// que possa aparecer "escondido" dentro de outra palavra (ver contexto.js pra
// entender como isso é comparado, e verificar-base-conhecimento.js pra testar).
// Por isso as duas formas (com e sem acento, singular e plural) costumam
// aparecer escritas por extenso, em vez de um "radical" comum às duas.
export const BASE_CONHECIMENTO = {
    hipoglicemia: {
        palavrasChave: ["hipoglicemia", "hipo", "glicemia baixa", "tremor", "suor frio"],
        texto:
            "Hipoglicemia (glicemia baixa): sinais comuns são tremores, suor frio, tontura, confusão e fome repentina. " +
            "A orientação geral é consumir uma fonte rápida de açúcar (suco, tablete de glicose) e medir novamente em 15 minutos. " +
            "Confusão severa, perda de consciência ou convulsão são emergência médica.",
    },
    hiperglicemia: {
        // "esta/está alta" foi adicionado depois de um bug real: o botão do chat manda
        // "Minha glicemia está alta", que não batia com "glicemia alta" (o "está" no
        // meio quebrava o encontro do texto) — a pergunta caía sempre no modo lento
        // (base inteira) por causa disso.
        palavrasChave: [
            "hiperglicemia",
            "hiper",
            "glicemia alta",
            "glicemia elevada",
            "esta alta",
            "está alta",
        ],
        texto:
            "Hiperglicemia (glicemia alta): sede excessiva, vontade frequente de urinar, cansaço e visão embaçada são sinais comuns. " +
            "Hidratação e, quando indicado no plano de tratamento, ajuste de insulina costumam ser as primeiras medidas. " +
            "Glicemia muito alta e repetida, com náusea, vômito ou respiração ofegante, exige atenção médica.",
    },
    alimentacao: {
        // Antes tinha uma keyword "aliment" (radical, sem sufixo) tentando bater com
        // "alimento"/"alimentos"/"alimentação" de uma vez. Isso quebrou quando a
        // comparação passou a exigir PALAVRA INTEIRA (ver contexto.js) — um radical
        // solto não é uma palavra completa. Solução: escrever as formas por extenso,
        // do mesmo jeito que já era feito em outras categorias desta base.
        palavrasChave: [
            "alimento",
            "alimentos",
            "alimentação",
            "alimentar",
            "comer",
            "comida",
            "dieta",
            "carboidrato",
            "carboidratos",
            "nutricionista",
            "nutrição",
            "evitar",
            "posso comer",
        ],
        texto:
            "Alimentação (fontes: Sociedade Brasileira de Diabetes e American Diabetes Association): priorize vegetais " +
            "(metade do prato), proteínas magras, grãos integrais (arroz integral, aveia, pão integral) e frutas inteiras " +
            "— nenhuma fruta é proibida, mas prefira a fruta inteira em vez do suco. " +
            "Evite ou limite açúcar e doces, frituras, gorduras animais (embutidos, carnes gordas, manteiga), molhos gordurosos, " +
            "excesso de sal e alimentos ultraprocessados. " +
            "Contar carboidratos e observar o índice glicêmico ajuda a prever o impacto na glicemia — " +
            "um nutricionista pode ajustar isso à rotina de cada pessoa.",
    },
    exercicio: {
        palavrasChave: ["exercicio", "exercício", "atividade fisica", "atividade física", "treino", "malhar"],
        texto:
            "Exercício físico: atividade física costuma reduzir a glicemia, então medir antes e depois ajuda a evitar hipoglicemia. " +
            "Exercícios intensos ou prolongados podem exigir ajuste na alimentação ou na dose de insulina, sempre orientado pelo médico.",
    },
    insulina: {
        palavrasChave: ["insulina", "aplicar insulina", "dose de insulina", "aplicação"],
        texto:
            "Aplicação de insulina: a técnica correta envolve rodízio dos locais de aplicação (abdômen, coxa, braço) " +
            "para evitar lipodistrofia, respeitando o tempo de ação de cada tipo de insulina. " +
            "A dose e o tipo são sempre definidos pelo médico — o app ajuda a registrar e calcular, não substitui a prescrição.",
    },
    // Categorias adicionadas em set/2026, com base em conteúdo público da Sociedade
    // Brasileira de Diabetes (diretriz.diabetes.org.br) e do Ministério da Saúde
    // (linhasdecuidado.saude.gov.br) — ver fontes citadas na conversa com o Claude.
    tipos_diabetes: {
        palavrasChave: [
            "tipo 1",
            "tipo 2",
            "diabetes tipo",
            "diferenca entre diabetes",
            "diferença entre diabetes",
            "diabetes gestacional",
            "o que e diabetes",
            "o que é diabetes",
        ],
        texto:
            "Tipos de diabetes: no tipo 1, o corpo não produz insulina — costuma aparecer em crianças/jovens e exige insulina desde o início. " +
            "No tipo 2, o mais comum, o corpo produz insulina mas não a usa bem, geralmente se desenvolve devagar e está ligado a fatores como idade e peso. " +
            "O diabetes gestacional aparece durante a gravidez e precisa de acompanhamento médico específico. " +
            "O tipo exato só é confirmado por exames clínicos.",
    },
    metas_glicemicas: {
        palavrasChave: [
            "meta glicemica",
            "meta glicêmica",
            "valor normal",
            "glicemia normal",
            "quanto deveria estar",
            "hemoglobina glicada",
            "hba1c",
            "glicemia de jejum",
            "glicemia ideal",
        ],
        texto:
            "Metas de glicemia (referência geral pra adultos, segundo a Sociedade Brasileira de Diabetes): em jejum, entre 80 e 130 mg/dL; " +
            "até 2h depois das refeições, abaixo de 180 mg/dL; hemoglobina glicada (HbA1c), abaixo de 7%. " +
            "Essas metas são individualizadas — o médico pode ajustar conforme idade, outras condições de saúde e risco de hipoglicemia.",
    },
    cuidados_pes: {
        palavrasChave: [
            "pe diabetico",
            "pé diabético",
            "cuidado com os pes",
            "cuidado com os pés",
            "ferida no pe",
            "ferida no pé",
            "unha encravada",
            "calo no pe",
            "calo no pé",
        ],
        texto:
            "Cuidados com os pés: examine os pés semanalmente procurando bolhas, calos, rachaduras ou feridas; " +
            "use calçados fechados e confortáveis, sem costura interna que machuque; mantenha a pele hidratada e as unhas bem cuidadas. " +
            "Procure atendimento médico rápido se notar ferida que não cicatriza, dormência, formigamento, ou mudança de cor/temperatura no pé — " +
            "essas complicações evoluem rápido em quem tem diabetes.",
    },
    // Categorias adicionadas em set/2026, com base em fontes internacionais de
    // renome (American Diabetes Association — Standards of Care; Mayo Clinic;
    // Joslin Diabetes Center/Harvard Medical School) — ver fontes citadas na
    // conversa com o Claude. Valores cruzados com a SBD quando aplicável.
    pre_diabetes: {
        palavrasChave: ["pre-diabetes", "pré-diabetes", "pre diabetes", "risco de diabetes", "vou desenvolver diabetes"],
        texto:
            "Pré-diabetes é o estágio em que a glicemia está acima do normal mas ainda não é diabetes: glicemia de jejum entre 100 e 125 mg/dL, " +
            "ou hemoglobina glicada entre 5,7% e 6,4% (critérios da American Diabetes Association). " +
            "Mudanças no estilo de vida (alimentação, atividade física, perda de peso) podem reduzir bastante o risco de evoluir pra diabetes tipo 2. " +
            "Vale fazer acompanhamento médico regular pra monitorar essa evolução.",
    },
    cetoacidose: {
        palavrasChave: [
            "cetoacidose",
            "cetona",
            "cetonas",
            "halito cetonico",
            "hálito cetônico",
            "respiracao ofegante",
            "respiração ofegante",
        ],
        texto:
            "Cetoacidose diabética é uma emergência médica: sinais incluem sede intensa, urinar muito, náusea, vômito, dor abdominal, " +
            "fraqueza extrema, respiração rápida/ofegante, hálito com cheiro adocicado e confusão mental. " +
            "Costuma acontecer com glicemia muito alta (acima de 300 mg/dL) e é mais comum no diabetes tipo 1. " +
            "Ao notar esses sinais, procure atendimento médico de emergência imediatamente — não é algo pra tratar em casa.",
    },
    dias_de_doenca: {
        palavrasChave: ["estou doente", "gripe", "resfriado", "dias de doenca", "dias de doença", "doente com diabetes", "vomitando"],
        texto:
            "Em dias de doença (gripe, infecção, vômito), continue tomando a medicação de diabetes normalmente, " +
            "a não ser que o médico oriente o contrário — mesmo comendo menos. " +
            "Meça a glicemia com mais frequência (a cada 3-4 horas em casos mais fortes) e beba bastante líquido pra evitar desidratação. " +
            "Procure atendimento médico se a glicemia ficar repetidamente acima de 250 mg/dL, se não conseguir manter líquidos no corpo, ou se a febre for alta.",
    },
    alcool: {
        palavrasChave: ["alcool", "álcool", "bebida alcoolica", "bebida alcoólica", "cerveja", "cervejas", "vinho", "vinhos", "posso beber"],
        texto:
            "Álcool e diabetes: bebida alcoólica pode causar hipoglicemia, inclusive horas depois de beber, porque o fígado prioriza " +
            "processar o álcool em vez de manter a glicemia estável — o risco é maior de estômago vazio. " +
            "Se for beber, faça isso junto com comida e com moderação (até 1 dose/dia pra mulheres, até 2 pra homens, segundo a American Diabetes Association). " +
            "Vale conversar com o médico sobre o que é seguro no seu caso, já que não existe uma regra única pra todo mundo.",
    },
    vacinas: {
        palavrasChave: ["vacina", "vacinas", "imunizacao", "imunização", "tomar vacina"],
        texto:
            "Pessoas com diabetes têm recomendação de manter a vacinação em dia, incluindo gripe (anual), covid-19, pneumonia (pneumocócica), " +
            "hepatite B e outras do calendário adulto — diabetes aumenta o risco de complicações em algumas infecções. " +
            "As vacinas certas pra cada pessoa variam por idade e histórico, então o ideal é confirmar com um médico ou farmacêutico quais fazem sentido pro seu caso.",
    },
    complicacoes_cronicas: {
        palavrasChave: [
            "complicacao",
            "complicação",
            "complicacoes",
            "complicações",
            "problema na vista",
            "problema no rim",
            "vista embacada",
            "vista embaçada",
        ],
        texto:
            "Diabetes mal controlado ao longo do tempo pode afetar os olhos (retinopatia, podendo levar à cegueira), os rins (nefropatia, podendo " +
            "levar à insuficiência renal), os nervos (neuropatia, formigamento/dormência que costuma começar nos pés) e o coração/vasos sanguíneos " +
            "(maior risco de infarto e AVC). A prevenção passa por manter a glicemia controlada, fazer exames de rotina (olhos, rins, pés) " +
            "pelo menos uma vez por ano, e manter hábitos saudáveis.",
    },
};
