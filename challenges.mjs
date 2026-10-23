import { randomInt, randomUUID } from 'node:crypto';
const item = (category, text, answer) => ({id:randomUUID(), category, text, answer:String(answer)});
export function normalize(s) { return String(s).normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase().replace(/\s+/g,' '); }
export function challenge() {
 const a=randomInt(3,20), b=randomInt(2,10), n=randomInt(2,7), k=randomInt(1,20);
 const variants=[
 ()=>item('Matemática',`Calcule: ${a} × ${b} + ${n}.`,a*b+n),
 ()=>item('Matemática',`Uma caixa tem ${a} lápis. Quantos lápis há em ${b} caixas?`,a*b),
 ()=>item('Sequências',`Complete: ${k}, ${k+n}, ${k+2*n}, ${k+3*n}, ?`,k+4*n),
 ()=>item('Padrões',`Complete: ${n}, ${n*2}, ${n*4}, ${n*8}, ?`,n*16),
 ()=>item('Ordenação',`Escreva em ordem crescente, separados por espaço: ${a+20}, ${b}, ${n+40}, ${k+60}.`,[a+20,b,n+40,k+60].sort((x,y)=>x-y).join(' ')),
 ()=>{const word=['CASA','LUA','NOITE','GATO','VIDA'][randomInt(5)];return item('Criptografia',`Cada letra foi avançada uma posição no alfabeto (A→B). Decifre: ${[...word].map(c=>String.fromCharCode(c.charCodeAt(0)+1)).join('')}.`,word)},
 ()=>item('Lógica',`Todos os corvos são aves. Toda ave tem penas. Os corvos têm penas? Responda sim ou não.`,'sim'),
 ()=>item('Dedução',`Ana chegou antes de Bia. Caio chegou depois de Bia. Quem chegou em segundo?`,'Bia'),
 ()=>{const symbols=Array.from({length:randomInt(12,22)},()=>randomInt(2)?'◆':'◇');return item('Atenção',`Quantos símbolos ◆ aparecem? ${symbols.join(' ')}`,symbols.filter(x=>x==='◆').length)},
 ()=>item('Enigma',`Tenho cidades sem casas, rios sem água e estradas sem carros. Sou um...`,'mapa'),
 ()=>item('Matemática',`Quanto é ${b*10}% de ${a*10}?`,a*b),
 ()=>item('Padrões',`A sequência repete ▲ ● ■. Qual símbolo ocupa a posição ${n*3+2}? Digite círculo, triângulo ou quadrado.`,'círculo'),
 ()=>item('Dedução',`Há ${a} pessoas. Cada uma cumprimenta as outras uma vez. Quantos cumprimentos acontecem?`,a*(a-1)/2),
 ()=>item('Sequências',`Complete: 1, 4, 9, 16, 25, ?`,36),
 ()=>item('Lógica',`Se hoje é terça-feira, que dia será daqui a ${7*n+2} dias?`,'quinta-feira'),
 ()=>{const sequence=Array.from({length:5},()=>randomInt(1,10)).join(' ');return {...item('Memória','Memorize os cinco números. Depois de 7 segundos, escreva-os na mesma ordem, separados por espaço.',sequence),preview:sequence,hideAfter:7000}},
 ];return variants[randomInt(variants.length)]();
}
