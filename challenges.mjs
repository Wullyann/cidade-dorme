import {randomInt,randomUUID} from 'node:crypto';
export const TASK_LIMIT=50;
export const interactiveKinds=['slide','pour','pixel','balance','order','wires','calibrate','rotate','maze','clean','timing','lights'];
export function normalize(s){return String(s).normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase().replace(/\s+/g,' ');}
const bank=[];
const add=(category,kind,generate)=>bank.push({model:'modelo-'+(bank.length+1),category,kind,generate});
const shuffle=values=>{const out=[...values];for(let i=out.length-1;i>0;i--){const j=randomInt(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;};
const make=(text,answer,extra={})=>({text,answer:String(answer),...extra});
const sample=(values,n)=>shuffle(values).slice(0,n);
add('Matemática','text',()=>{const a=randomInt(3,20),b=randomInt(2,10),n=randomInt(2,7);return make(`Calcule: ${a} × ${b} + ${n}.`,a*b+n);});
add('Matemática','text',()=>{const a=randomInt(3,20),b=randomInt(2,10);return make(`Uma caixa tem ${a} lápis. Quantos lápis há em ${b} caixas?`,a*b);});
add('Sequências','text',()=>{const k=randomInt(1,20),n=randomInt(2,7);return make(`Complete: ${k}, ${k+n}, ${k+2*n}, ${k+3*n}, ?`,k+4*n);});
add('Padrões','text',()=>{const n=randomInt(2,7);return make(`Complete: ${n}, ${n*2}, ${n*4}, ${n*8}, ?`,n*16);});
add('Ordenação','text',()=>{const numbers=sample(Array.from({length:90},(_,i)=>i+1),4);return make('Escreva em ordem crescente, separados por espaço: '+numbers.join(', '),[...numbers].sort((a,b)=>a-b).join(' '));});
add('Criptografia','text',()=>{const word=sample(['CASA','LUA','NOITE','GATO','VIDA'],1)[0];return make('Cada letra foi avançada uma posição (A→B). Decifre: '+[...word].map(c=>String.fromCharCode(c.charCodeAt(0)+1)).join(''),word);});
add('Lógica','text',()=>make('Todos os corvos são aves. Toda ave tem penas. Os corvos têm penas? Responda sim ou não.','sim'));
add('Dedução','text',()=>make('Ana chegou antes de Bia. Caio chegou depois de Bia. Quem chegou em segundo?','Bia'));
add('Atenção','text',()=>{const symbols=Array.from({length:randomInt(12,22)},()=>randomInt(2)?'◆':'◇');return make('Quantos símbolos ◆ aparecem? '+symbols.join(' '),symbols.filter(x=>x==='◆').length);});
add('Enigma','text',()=>make('Tenho cidades sem casas, rios sem água e estradas sem carros. Sou um...','mapa'));
add('Matemática','text',()=>{const a=randomInt(3,20),b=randomInt(2,10);return make(`Quanto é ${b*10}% de ${a*10}?`,a*b);});
add('Padrões','text',()=>{const n=randomInt(2,7);return make(`A sequência repete ▲ ● ■. Qual símbolo ocupa a posição ${n*3+2}? Digite círculo, triângulo ou quadrado.`,'círculo');});
add('Dedução','text',()=>{const n=randomInt(3,20);return make(`Há ${n} pessoas. Cada uma cumprimenta as outras uma vez. Quantos cumprimentos acontecem?`,n*(n-1)/2);});
add('Sequências','text',()=>make('Complete: 1, 4, 9, 16, 25, ?',36));
add('Lógica','text',()=>make('Se hoje é terça-feira, que dia será daqui a 16 dias?','quinta-feira'));
add('Memória','text',()=>{const sequence=Array.from({length:5},()=>randomInt(1,10)).join(' ');return make('Memorize os números. Após 7 segundos, escreva-os na mesma ordem.',sequence,{preview:sequence,hideAfter:7000});});
add('Matemática','choice',()=>{const a=randomInt(3,20),b=randomInt(2,10),n=randomInt(2,7),answer=a*b+n;return make(`Resolva: ${a} × ${b} + ${n}.`,answer,{choices:shuffle([answer,answer+2,Math.max(0,answer-3),answer+5]).map(String)});});
add('Atenção','choice',()=>{const dominant=randomInt(2)?'◆':'◇',other=dominant==='◆'?'◇':'◆';return make('Qual símbolo aparece mais vezes? '+shuffle([dominant,dominant,dominant,other,other]).join(' '),dominant,{choices:['◆','◇']});});
add('Memória','sequence',()=>{const sequence=Array.from({length:4},()=>sample(['azul','vermelho','verde'],1)[0]);return make('Memorize as cores e reproduza a sequência após ela se ocultar.',sequence.join(' '),{choices:['azul','vermelho','verde'],preview:sequence.join(' → '),hideAfter:4000});});
add('Associações','choice',()=>{const pairs=[['gato','miau'],['peixe','nada'],['pássaro','voa']],correct=randomInt(3),choices=pairs.map(([animal,action],i)=>animal+'—'+(i===correct?action:pairs[(i+1)%3][1]));return make('Escolha a única associação correta.',choices[correct],{choices:shuffle(choices)});});
add('Reconhecimento','choice',()=>make('Qual símbolo está faltando? ▲ ● ▲ ● ▲ ?','●',{choices:['▲','●','■','◆','★','✚']}));
for(let mode=0;mode<6;mode++)add('Organizar carga','order',()=>{
 let labels,text;
 if(mode<3){const values=sample(Array.from({length:80},(_,i)=>i+1),5).sort((a,b)=>mode===1?b-a:a-b);labels=values.map(n=>mode===2?n+' kg':String(n));text=mode===1?'Organize as caixas do maior para o menor número.':'Organize as caixas do menor para o maior valor.';}
 else if(mode===3){labels=sample(['abacate','banana','caju','damasco','figo','goiaba','kiwi','limão'],5).sort((a,b)=>a.localeCompare(b,'pt-BR'));text='Organize as frutas em ordem alfabética.';}
 else if(mode===4){labels=['Mercúrio','Vênus','Terra','Marte','Júpiter'];text='Organize os planetas do mais próximo ao mais distante do Sol.';}
 else{labels=['semente','broto','planta','flor','fruto'];text='Organize as etapas do crescimento de uma planta.';}
 const ordered=labels.map((label,i)=>({id:'p'+i,label}));let parts=shuffle(ordered);if(parts.every((p,i)=>p.id===ordered[i].id))parts=[...parts.slice(1),parts[0]];
 return make(text+' Arraste as peças ou use as setas.',ordered.map(p=>p.id).join(' '),{parts});
});
for(let mode=0;mode<6;mode++)add('Conectar circuitos','wires',()=>{
 let pairs;
 if(mode===0)pairs=sample(['▲','●','■','◆','★','✚'],4).map(s=>[s,s]);
 else if(mode===1)pairs=sample(['A','B','C','D','E','F'],4).map(s=>[s,s.toLowerCase()]);
 else if(mode===2)pairs=sample(['AZUL','VERDE','AMARELO','ROXO','ROSA'],4).map(s=>[s,s]);
 else if(mode===3)pairs=sample([['gato','miau'],['cachorro','au-au'],['vaca','mugido'],['ovelha','balido'],['sapo','coaxar']],4);
 else if(mode===4)pairs=sample([1,2,3,4,5,6,7,8,9],4).map(n=>[`${n} + ${n}`,String(n*2)]);
 else pairs=sample([['1/2','50%'],['1/4','25%'],['3/4','75%'],['1/5','20%'],['1/10','10%']],4);
 const left=pairs.map(([label],i)=>({id:'l'+i,label})),right=shuffle(pairs.map(([,label],i)=>({id:'r'+i,label})));
 return make('Conecte cada terminal da esquerda ao correspondente da direita. Arraste um fio ou toque nos dois terminais.',pairs.map((_,i)=>'l'+i+'=r'+i).join(';'),{left:shuffle(left),right});
});
for(let mode=0;mode<4;mode++)add('Calibrar sistemas','calibrate',()=>{
 const names=[['Combustível A','Combustível B','Combustível C'],['Pressão A','Pressão B','Pressão C'],['Temperatura A','Temperatura B','Temperatura C'],['Sinal A','Sinal B','Sinal C']][mode];
 const gauges=names.map((label,i)=>({id:'g'+i,label,min:0,max:100,step:5,start:0,target:randomInt(3,19)*5}));
 return make('Arraste os três reguladores até os valores indicados nos alvos.',gauges.map(g=>g.target).join(' '),{gauges});
});
for(let mode=0;mode<4;mode++)add('Alinhar mecanismos','rotate',()=>{
 const dials=Array.from({length:3+mode%2},(_,i)=>{const target=randomInt(4);return {id:'d'+i,label:['Válvula','Antena','Engrenagem','Radar'][mode]+' '+(i+1),target,start:(target+randomInt(1,4))%4};});
 return make('Gire cada mecanismo até a seta apontar para a mesma direção do alvo.',dials.map(d=>d.target).join(' '),{dials});
});
function maze(size){const grid=Array.from({length:size},()=>Array(size).fill('#'));grid[1][1]='.';const stack=[[1,1]];
 while(stack.length){const [r,c]=stack.at(-1),next=shuffle([[r-2,c],[r+2,c],[r,c-2],[r,c+2]]).find(([y,x])=>y>0&&x>0&&y<size-1&&x<size-1&&grid[y][x]==='#');if(!next){stack.pop();continue;}const[y,x]=next;grid[(r+y)/2][(c+x)/2]='.';grid[y][x]='.';stack.push(next);}
 const start=[1,1],goal=[size-2,size-2],queue=[[start]],seen=new Set(['1,1']);let solution;
 for(let i=0;i<queue.length;i++){const path=queue[i],[r,c]=path.at(-1);if(r===goal[0]&&c===goal[1]){solution=path;break;}for(const[y,x]of[[r-1,c],[r+1,c],[r,c-1],[r,c+1]])if(grid[y]?.[x]==='.'&&!seen.has(y+','+x)){seen.add(y+','+x);queue.push([...path,[y,x]]);}}
 return {grid:grid.map(row=>row.join('')),start,goal,solution};
}
for(let mode=0;mode<4;mode++)add('Navegar labirinto','maze',()=>{const {solution,...board}=maze(mode<2?7:9);return make('Leve a energia do início até a saída. Desenhe o caminho, toque nas casas vizinhas ou use as setas.',solution.map(p=>p.join(',')).join('|'),board);});
for(let mode=0;mode<4;mode++)add('Limpar equipamentos','clean',()=>{
 const spots=Array.from({length:12+mode*2},(_,i)=>({id:'s'+i,x:12+randomInt(77),y:12+randomInt(77),r:6+randomInt(4)}));
 return make('Limpe '+['o visor','o painel solar','a lente do radar','a janela de inspeção'][mode]+'. Passe o dedo ou o mouse sobre todas as manchas. Também é possível focar uma mancha e pressionar Espaço.',spots.map(s=>s.id).sort().join(' '),{spots});
});
for(let mode=0;mode<4;mode++)add('Sincronizar sinal','timing',()=>{const period=3200+mode*400,targetStart=period*.35,targetEnd=period*.7;return make('Inicie o sinal e pressione Parar quando o ponteiro estiver dentro da faixa verde.','stop',{period,targetStart,targetEnd,startedAt:null});});
export function toggleLights(board,index){const out=[...board],r=Math.floor(index/3),c=index%3;for(const[y,x]of[[r,c],[r-1,c],[r+1,c],[r,c-1],[r,c+1]])if(y>=0&&x>=0&&y<3&&x<3)out[y*3+x]=!out[y*3+x];return out;}
for(let mode=0;mode<4;mode++)add('Restaurar energia','lights',()=>{
 let initial=Array(9).fill(false);const moves=sample([0,1,2,3,4,5,6,7,8],3+mode);for(const index of moves)initial=toggleLights(initial,index);if(initial.every(x=>!x)){moves.push(4);initial=toggleLights(initial,4);}
 return make('Apague todas as luzes. Cada interruptor também muda seus vizinhos de cima, baixo, esquerda e direita.',[...moves].reverse().join(' '),{initial});
});
for(let mode=0;mode<4;mode++)add('Memória visual','sequence',()=>{const colors=['azul','vermelho','verde','amarelo'],sequence=Array.from({length:4+mode%2},()=>colors[randomInt(colors.length)]);return make('Memorize a sequência e reproduza as cores depois que ela se ocultar.',sequence.join(' '),{choices:colors,preview:sequence.join(' → '),hideAfter:4000+mode*500});});
for(let mode=0;mode<6;mode++)add('Reconstruir mosaico','slide',()=>{
 let tiles=[1,2,3,4,5,6,7,8,0],trace=[],blank=8;
 for(let i=0;i<25+mode*5;i++){const candidates=[0,1,2,3,4,5,6,7,8].filter(j=>Math.abs(Math.floor(j/3)-Math.floor(blank/3))+Math.abs(j%3-blank%3)===1),next=candidates[randomInt(candidates.length)];trace.push(blank);[tiles[next],tiles[blank]]=[tiles[blank],tiles[next]];blank=next;}
 return make('Deslize as peças vizinhas do espaço vazio para organizar 1 a 8. O vazio deve ficar no canto inferior direito.',trace.reverse().join(' '),{tiles});
});
for(let mode=0;mode<6;mode++)add('Transferir líquidos','pour',()=>{
 const total=6+mode,capacity=[total,total,total],initial=[total,0,0],goal=[total,0,0],moves=[];
 for(let i=0;i<8;i++){const from=randomInt(3),to=(from+randomInt(1,3))%3;if(goal[from]>0&&goal[to]<capacity[to]){goal[from]--;goal[to]++;moves.push(from+'>'+to);}}
 if(goal.join()===initial.join()){goal[0]--;goal[1]++;moves.push('0>1');}
 return make('Transfira uma unidade por vez: toque no recipiente de origem e depois no destino. Alcance os três volumes-alvo.',moves.join(' '),{capacity,initialVolumes:initial,goal});
});
for(let mode=0;mode<6;mode++)add('Reparar desenho','pixel',()=>{
 const pattern=Array.from({length:25},()=>randomInt(2));pattern[12]=1;
 return make('Reproduza o desenho de referência no painel vazio. Toque ou passe o dedo nas casas; use Apagar para corrigir.',pattern.join(''),{pattern});
});
for(let mode=0;mode<6;mode++)add('Equilibrar balança','balance',()=>{
 const weights=sample([1,2,3,4,5,6,7,8,9,10,11,12],6),chosen=sample([0,1,2,3,4,5],3),target=chosen.reduce((n,i)=>n+weights[i],0);
 return make('Coloque pesos no prato até igualar a massa indicada. Toque novamente em um peso para retirá-lo.',chosen.sort().join(' '),{weights,target});
});
export const bankSize=bank.length;
export function challenge(kind=null,exclude=new Set()){
 const candidates=bank.filter(t=>(!kind||t.kind===kind)&&!exclude.has(t.model));if(!candidates.length)throw new Error('Não há modelos de tarefa disponíveis.');
 const template=candidates[randomInt(candidates.length)];return {id:randomUUID(),model:template.model,category:template.category,kind:template.kind,...template.generate()};
}
export function validateChallenge(task,answer,now=Date.now()){
 if(typeof answer!=='string'&&typeof answer!=='number')return false;const text=String(answer);if(text.length>4000)return false;
 if(task.kind==='pixel')return text===task.pattern.join('');
 if(task.kind==='balance'){const ids=text.trim().split(/\s+/).map(Number);return !!text.trim()&&new Set(ids).size===ids.length&&ids.every(i=>Number.isInteger(i)&&i>=0&&i<task.weights.length)&&ids.reduce((n,i)=>n+task.weights[i],0)===task.target;}
 if(task.kind==='slide'){let tiles=[...task.tiles];const moves=text.trim()?text.trim().split(/\s+/).map(Number):[];if(moves.length>500)return false;for(const i of moves){const b=tiles.indexOf(0);if(!Number.isInteger(i)||i<0||i>8||Math.abs(Math.floor(i/3)-Math.floor(b/3))+Math.abs(i%3-b%3)!==1)return false;[tiles[i],tiles[b]]=[tiles[b],tiles[i]];}return tiles.join()==='1,2,3,4,5,6,7,8,0';}
 if(task.kind==='pour'){const volumes=[...task.initialVolumes],moves=text.trim().split(/\s+/);if(moves.length>500)return false;for(const move of moves){if(!/^[0-2]>[0-2]$/.test(move))return false;const[a,b]=move.split('>').map(Number);if(a===b||!volumes[a]||volumes[b]>=task.capacity[b])return false;volumes[a]--;volumes[b]++;}return volumes.join()===task.goal.join();}
 if(task.kind==='timing'){if(!task.startedAt||text!=='stop')return false;const position=(now-task.startedAt)%task.period;return now>=task.startedAt+500&&position>=task.targetStart-100&&position<=task.targetEnd+100;}
 if(task.kind==='maze'){const path=text.split('|').map(step=>step.split(',').map(Number));if(path.length<2||path.length>400||path.some(p=>p.length!==2||p.some(n=>!Number.isInteger(n))))return false;if(path[0].join(',')!==task.start.join(',')||path.at(-1).join(',')!==task.goal.join(','))return false;return path.every(([r,c],i)=>task.grid[r]?.[c]==='.'&&(!i||Math.abs(r-path[i-1][0])+Math.abs(c-path[i-1][1])===1));}
 if(task.kind==='lights'){if(!text.trim())return false;const moves=text.trim().split(/\s+/).map(Number);if(moves.length>500||moves.some(n=>!Number.isInteger(n)||n<0||n>8))return false;return moves.reduce((board,n)=>toggleLights(board,n),task.initial).every(x=>!x);}
 return normalize(text)===normalize(task.answer);
}

