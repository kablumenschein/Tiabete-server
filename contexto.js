import { BASE_CONHECIMENTO } from "./baseConhecimento.js";

// Só deixa minúsculo. ANTES, essa função também tirava acento com um truque de
// Unicode (normalize("NFD") + regex) — funcionava, mas é o tipo de linha que
// ninguém adivinha o motivo só de olhar. Trocado por uma solução mais simples de
// explicar: as DUAS formas (com e sem acento) já estão escritas direto na lista
// de palavrasChave, então comparar só em minúsculo já é suficiente.
export function normalizar(texto) {
    return texto.toLowerCase();
}

// PALAVRA INTEIRA, NÃO PEDAÇO: a primeira versão comparava com
// "pergunta.includes(palavraChave)" — ou seja, "a pergunta CONTÉM esse pedaço de
// texto em qualquer lugar". Isso causou dois bugs reais nesta base: a palavra-chave
// "calo" (categoria pés) batia dentro de "calorias" (categoria errada!), e "dose"
// (categoria insulina) batia dentro de "cetoacidose" (categoria errada, e ainda por
// cima uma emergência médica sendo desviada pra resposta sobre insulina).
//
// A correção: a palavra-chave só "bate" se aparecer como palavra (ou frase) INTEIRA
// no texto — ou seja, com um espaço, pontuação, ou início/fim de frase antes e
// depois dela, nunca "grudada" dentro de outra palavra maior.
//
// Como isso é feito: "(?<!X)" e "(?!X)" são "espiadas" (lookaround) — checam o que
// vem antes/depois SEM consumir esse trecho no casamento. "\p{L}" e "\p{N}" são
// "qualquer letra" e "qualquer número" em Unicode (funciona com acento — á, ç, ã
// contam como letra). Então a regex lê: "não pode ter letra/número logo antes, nem
// logo depois" — ou seja, é obrigatório ser uma palavra separada, isolada.
function contemPalavraOuFrase(textoNormalizado, chaveNormalizada) {
    const chaveEscapada = chaveNormalizada.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${chaveEscapada}(?![\\p{L}\\p{N}])`, "u");
    return regex.test(textoNormalizado);
}

// Retorna o NOME da categoria que bateu (ou null se nenhuma bateu). Separado de
// montarContexto() de propósito, pra dar pra testar só o "roteamento" sozinho —
// é isso que o verificar-base-conhecimento.js usa.
export function encontrarCategoria(pergunta) {
    const perguntaNormalizada = normalizar(pergunta);

    for (const [nomeCategoria, categoria] of Object.entries(BASE_CONHECIMENTO)) {
        const bateu = categoria.palavrasChave.some((palavra) =>
            contemPalavraOuFrase(perguntaNormalizada, normalizar(palavra))
        );
        if (bateu) {
            return nomeCategoria;
        }
    }

    return null;
}

// PERFORMANCE: em vez de mandar todas as categorias inteiras pro modelo em toda
// pergunta (o que deixa o texto processado maior e a resposta mais lenta, e no
// plano gratuito do Groq consome mais rápido o limite de tokens por minuto),
// tenta achar a categoria certa pela palavra-chave e manda só ela. Se não achar
// nenhuma com confiança, cai de volta pra base inteira (mantém a garantia de que
// perguntas fora dessas categorias ainda têm chance de resposta, só que mais devagar).
export function montarContexto(pergunta) {
    const nomeCategoria = encontrarCategoria(pergunta);

    if (nomeCategoria) {
        return BASE_CONHECIMENTO[nomeCategoria].texto;
    }

    return Object.values(BASE_CONHECIMENTO)
        .map((categoria) => categoria.texto)
        .join("\n\n");
}
