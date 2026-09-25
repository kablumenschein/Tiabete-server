// Roda com: npm run verificar
//
// O QUE ESSE SCRIPT FAZ: testa cada palavra-chave da base contra a própria função
// de roteamento (encontrarCategoria, em contexto.js). Se uma palavra-chave da
// categoria "X" não roteia pra "X" quando testada sozinha, é sinal de que ela está
// sendo "roubada" por outra categoria — exatamente o tipo de bug que já pegamos
// duas vezes nesta base ("calo" dentro de "calorias", "dose" dentro de
// "cetoacidose"). Rode isso sempre que adicionar ou mudar uma categoria, antes de
// dar commit/push — pega o problema aqui, não em produção.
import { BASE_CONHECIMENTO } from "./baseConhecimento.js";
import { encontrarCategoria } from "./contexto.js";

let problemas = 0;

for (const [nomeCategoria, categoria] of Object.entries(BASE_CONHECIMENTO)) {
    for (const palavra of categoria.palavrasChave) {
        const categoriaEncontrada = encontrarCategoria(palavra);

        if (categoriaEncontrada !== nomeCategoria) {
            problemas++;
            console.log(
                `❌ A palavra-chave "${palavra}" está na categoria "${nomeCategoria}", ` +
                `mas na prática roteia pra "${categoriaEncontrada ?? "nenhuma categoria"}".`
            );
        }
    }
}

const totalCategorias = Object.keys(BASE_CONHECIMENTO).length;

if (problemas === 0) {
    console.log(`✅ Tudo certo: ${totalCategorias} categorias, nenhuma colisão encontrada.`);
    process.exit(0);
} else {
    console.log(`\n${problemas} problema(s) encontrado(s). Ajuste as palavras-chave acima antes de publicar.`);
    process.exit(1);
}
