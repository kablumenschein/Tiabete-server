import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();

// TRUST PROXY: o Render coloca o servidor atrás de um proxy reverso (é assim que
// o HTTPS funciona). Sem isso, o Express não confia no cabeçalho "X-Forwarded-For"
// que o proxy manda, e o rate limit (lá embaixo) não consegue identificar o IP de
// quem fez a requisição pra contar corretamente. "1" = confia em 1 proxy na frente.
app.set("trust proxy", 1);

// CORS: só as origens listadas em ALLOWED_ORIGINS (separadas por vírgula) podem chamar
// este servidor. Em dev, o padrão cobre Live Server e "abrir o HTML direto" (origin null).
// Quando hospedar de verdade, defina ALLOWED_ORIGINS no .env com o domínio do GlicHelp.
const ALLOWED_ORIGINS = (
    process.env.ALLOWED_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500,null"
).split(",");

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Origem não permitida pelo CORS"));
            }
        },
    })
);
// Limite de tamanho do corpo aceito: rejeita corpo grande demais antes mesmo de
// processar (defesa extra, além da checagem de tamanho da pergunta lá embaixo).
app.use(express.json({ limit: "2kb" }));

const PORT = process.env.PORT || 3001;
// GROQ: trocamos da NVIDIA NIM pro Groq em set/2026 — mesmo modelo exato
// (openai/gpt-oss-20b), só que rodando no hardware próprio do Groq (LPU),
// muito mais rápido no plano gratuito. A API é compatível com o formato da
// OpenAI, então o corpo da requisição não muda, só a URL e a chave.
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = "openai/gpt-oss-20b"; // gratuito, feito pra baixa latência (21B params, 3.6B ativos), checado em set/2026
const TAMANHO_MAXIMO_PERGUNTA = 500; // caracteres — evita perguntas gigantes consumindo crédito à toa
const MAX_TOKENS_RESPOSTA = 300; // subido de 250: uma resposta real bateu nesse teto e ficou cortada no meio

// BASE DE CONHECIMENTO — SEGURANÇA: isso mora só aqui no servidor, nunca é enviado
// pelo navegador. Antes, o glicbot.js mandava esse texto como "contexto" a cada
// chamada, o que significava que qualquer pessoa com o DevTools aberto podia
// substituir o conteúdo confiável por qualquer texto e o modelo trataria como
// verdade. Agora o cliente manda só a pergunta; o servidor decide o contexto.
//
// As palavrasChave incluem as duas formas (com e sem acento) de propósito —
// veja a função normalizar() logo abaixo pra entender por quê.
const BASE_CONHECIMENTO = {
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
        palavrasChave: ["alimenta", "comer", "comida", "dieta", "carboidrato", "nutri"],
        texto:
            "Alimentação: contar carboidratos e observar o índice glicêmico ajuda a prever o impacto na glicemia. " +
            "Refeições com fibra, proteína e gordura costumam causar picos mais suaves do que carboidrato simples isolado. " +
            "Um nutricionista pode ajustar isso à rotina de cada pessoa.",
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
        palavrasChave: ["alcool", "álcool", "bebida alcoolica", "bebida alcoólica", "cerveja", "vinho", "posso beber"],
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

// Só deixa minúsculo. ANTES, essa função também tirava acento com um truque de
// Unicode (normalize("NFD") + regex) — funcionava, mas é o tipo de linha que
// ninguém adivinha o motivo só de olhar. Trocado por uma solução mais simples de
// explicar: as DUAS formas (com e sem acento) já estão escritas direto na lista
// de palavrasChave acima, então comparar só em minúsculo já é suficiente.
function normalizar(texto) {
    return texto.toLowerCase();
}

// PERFORMANCE: em vez de mandar as 5 categorias inteiras pro modelo em toda
// pergunta (o que deixava o texto processado maior e a resposta mais lenta),
// tenta achar a categoria certa pela palavra-chave e manda só ela. Se não
// achar nenhuma com confiança, cai de volta pra base inteira (mantém a
// garantia de que perguntas fora dessas 5 ainda têm chance de resposta,
// só que mais devagar).
function montarContexto(pergunta) {
    const perguntaNormalizada = normalizar(pergunta);

    for (const categoria of Object.values(BASE_CONHECIMENTO)) {
        const bateu = categoria.palavrasChave.some((palavra) =>
            perguntaNormalizada.includes(normalizar(palavra))
        );
        if (bateu) {
            return categoria.texto;
        }
    }

    return Object.values(BASE_CONHECIMENTO)
        .map((categoria) => categoria.texto)
        .join("\n\n");
}

// CACHE DE RESPOSTAS: as 5 perguntas dos botões do chat são sempre o mesmo texto,
// sempre o mesmo contexto — ou seja, a resposta da IA pra elas tende a ser sempre
// a mesma. Guardando a primeira resposta gerada e servindo ela nas próximas vezes
// que a MESMA pergunta (exata) chegar, os botões ficam quase instantâneos depois
// do primeiro uso, sem gastar crédito de novo. Perguntas digitadas livremente
// (que variam) continuam indo pra IA normalmente na maioria das vezes.
const CACHE_TAMANHO_MAXIMO = 100;
const cacheDeRespostas = new Map();

function buscarNoCache(pergunta) {
    return cacheDeRespostas.get(normalizar(pergunta.trim()));
}

function guardarNoCache(pergunta, resposta) {
    const chave = normalizar(pergunta.trim());

    // Mapa cheio: remove a entrada mais antiga antes de guardar a nova (Map do
    // JavaScript mantém a ordem de inserção, então a primeira chave é a mais velha).
    if (cacheDeRespostas.size >= CACHE_TAMANHO_MAXIMO) {
        const chaveMaisAntiga = cacheDeRespostas.keys().next().value;
        cacheDeRespostas.delete(chaveMaisAntiga);
    }

    cacheDeRespostas.set(chave, resposta);
}

// RATE LIMIT: no máximo 10 perguntas por IP a cada minuto — protege o crédito
// gratuito do Groq contra uso repetido/abusivo.
const limitador = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: "Muitas perguntas em pouco tempo. Espere um minuto e tente de novo." },
});

// RETRY: cobre dois tipos de falha passageira — o Groq responder com erro 5xx
// e a chamada nem sair do servidor (oscilação de rede, "fetch failed").
//
// Como o loop funciona, em palavras: tenta a chamada; se der erro que pode ser
// passageiro E ainda sobrar tentativa, espera 1 segundo e volta pro topo do loop
// (o "continue"); se der certo, sai da função imediatamente com "return"; se
// esgotar as tentativas, lança o erro pra fora (quem chamou trata no catch).
// Sem retry em erros 4xx: aí o problema é de configuração (chave errada, corpo
// inválido etc.) e tentar de novo não muda nada.
async function chamarGroqComRetry(promptSistema, pergunta, tentativas = 2) {
    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
        const aindaTemTentativa = tentativa < tentativas;
        let resposta;

        try {
            resposta = await fetch(GROQ_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: MODELO,
                    messages: [
                        { role: "system", content: promptSistema },
                        { role: "user", content: pergunta },
                    ],
                    temperature: 0.3,
                    max_tokens: MAX_TOKENS_RESPOSTA,
                }),
            });
        } catch (erroDeRede) {
            if (aindaTemTentativa) {
                console.log(
                    JSON.stringify({
                        quando: new Date().toISOString(),
                        aviso: `Tentativa ${tentativa} falhou na rede (${erroDeRede.message}), tentando de novo...`,
                    })
                );
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }
            throw erroDeRede;
        }

        if (resposta.ok) {
            return resposta;
        }

        const souErro5xx = resposta.status >= 500;

        if (souErro5xx && aindaTemTentativa) {
            console.log(
                JSON.stringify({
                    quando: new Date().toISOString(),
                    aviso: `Tentativa ${tentativa} falhou com ${resposta.status}, tentando de novo...`,
                })
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
        }

        const detalhe = await resposta.text();
        throw new Error(`Groq respondeu ${resposta.status}: ${detalhe}`);
    }
}

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.post("/api/glicbot", limitador, async (req, res) => {
    const inicio = Date.now();
    const { pergunta } = req.body || {};

    if (!pergunta) {
        return res.status(400).json({ erro: "Campo 'pergunta' é obrigatório." });
    }

    if (pergunta.length > TAMANHO_MAXIMO_PERGUNTA) {
        return res.status(400).json({
            erro: `Pergunta muito longa (máximo ${TAMANHO_MAXIMO_PERGUNTA} caracteres).`,
        });
    }

    const respostaEmCache = buscarNoCache(pergunta);
    if (respostaEmCache) {
        console.log(
            JSON.stringify({
                quando: new Date().toISOString(),
                perguntaTamanho: pergunta.length,
                duracaoMs: Date.now() - inicio,
                origem: "cache",
                sucesso: true,
            })
        );
        return res.json({ resposta: respostaEmCache });
    }

    if (!GROQ_API_KEY) {
        console.error("[GlicBot] GROQ_API_KEY não configurada no .env");
        return res.status(500).json({ erro: "Servidor sem chave de API configurada." });
    }

    const contexto = montarContexto(pergunta);

    // Aqui está o princípio "cuidado com desvio": o modelo só pode responder com
    // base no CONTEXTO abaixo (que agora vem só do servidor, nunca do navegador),
    // e precisa admitir quando não sabe, em vez de inventar. A linha "Reasoning: low"
    // é a convenção do gpt-oss pra pedir resposta rápida, sem raciocínio longo interno
    // — sem isso, o ganho de velocidade de trocar de modelo se perderia.
    const promptSistema = [
        "Reasoning: low",
        "",
        "Você é o Tiabete, assistente do app GlicHelp para pessoas com diabetes.",
        "Responda SOMENTE com base no CONTEXTO abaixo. Se a resposta não estiver nele, diga que ainda não tem essa informação e sugira falar com um profissional de saúde.",
        "Nunca invente doses, diagnósticos ou informações que não estejam no contexto.",
        "Responda de forma direta e curta (até 3 frases).",
        "",
        "CONTEXTO:",
        contexto,
    ].join("\n");

    try {
        const resposta = await chamarGroqComRetry(promptSistema, pergunta);

        const dados = await resposta.json();

        // "?." (optional chaining): se qualquer parte no meio do caminho não existir
        // (ex.: o Groq não mandou "choices"), a expressão inteira vira "undefined"
        // em vez de quebrar o servidor com erro. É o mesmo que checar cada nível com
        // "if" um dentro do outro, só que mais curto.
        const texto =
            dados.choices?.[0]?.message?.content?.trim() ||
            "Não consegui gerar uma resposta agora.";

        guardarNoCache(pergunta, texto);

        // MÉTRICA/LOG mínimo: um log estruturado por requisição, desde o dia 1.
        // dados.usage vem do próprio Groq — é como a gente enxerga o consumo de
        // crédito antes de ele acabar, sem precisar de painel nenhum.
        console.log(
            JSON.stringify({
                quando: new Date().toISOString(),
                perguntaTamanho: pergunta.length,
                duracaoMs: Date.now() - inicio,
                tokensUsados: dados.usage || null,
                origem: "groq",
                sucesso: true,
            })
        );

        res.json({ resposta: texto });
    } catch (erro) {
        console.error(
            JSON.stringify({
                quando: new Date().toISOString(),
                sucesso: false,
                erro: erro.message,
            })
        );
        res.status(502).json({ erro: "Falha ao consultar o modelo de IA." });
    }
});

app.listen(PORT, () => {
    console.log(`GlicBot server rodando em http://localhost:${PORT}`);
});
