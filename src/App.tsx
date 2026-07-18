import {useMemo,useState} from 'react'
import {BOARD_SIZE,CENTERS,createBoard} from './game/board'
import {createDictionary} from './game/dictionary'
import {findLegalMove} from './game/legalMoveSearch'
import {ALPHABET,createGame,snapshot,useLetters,VOWELS} from './game/state'
import type {GameState,PlayerId} from './game/types'
import {validateTentativeMove,type TentativeLetter} from './game/validation'

const clone=<T,>(x:T):T=>structuredClone(x)
type DragTile={letter:string;row?:number;col?:number}

export default function App(){
 const [game,setGame]=useState<GameState>(createGame)
 const [tentative,setTentative]=useState<TentativeLetter[]>([])
 const [dragging,setDragging]=useState<DragTile|null>(null)
 const [dragPoint,setDragPoint]=useState({x:0,y:0})
 const [allowAny,setAllowAny]=useState(false)
 const [devOpen,setDevOpen]=useState(false)
 const [showHow,setShowHow]=useState(false)
 const [importText,setImportText]=useState('')
 const [letterSets,setLetterSets]=useState(['ABCDEFGHIJKLMNOPQRSTUVWXYZ','ABCDEFGHIJKLMNOPQRSTUVWXYZ'])
 const dict=useMemo(()=>createDictionary(allowAny),[allowAny])
 const player=game.players[game.active]
 const lastId=game.moves.at(-1)?.id
 const legal=useMemo(()=>game.status==='playing'?findLegalMove(game.board,player,dict):null,[game.board,player,dict,game.status])
 const check=useMemo(()=>validateTentativeMove(game.board,player,tentative,dict),[game.board,player,tentative,dict])
 const prospectiveCycle=useMemo(()=>useLetters(player,check.result.placements.filter(x=>x.isNew).map(x=>x.letter)),[player,check.result.placements])

 function startDrag(letter:string,x:number,y:number,row?:number,col?:number){setDragging({letter,row,col});setDragPoint({x,y})}
 function dropOnBoard(row:number,col:number){
  if(!dragging||game.board[row][col])return
  setTentative(old=>{
   const withoutSource=old.filter(p=>p.row!==dragging.row||p.col!==dragging.col)
   if(withoutSource.some(p=>p.row===row&&p.col===col)||withoutSource.some(p=>p.letter===dragging.letter))return old
   return [...withoutSource,{row,col,letter:dragging.letter}]
  })
  setDragging(null)
 }
 function returnToRack(){if(dragging?.row!==undefined)setTentative(old=>old.filter(p=>p.row!==dragging.row||p.col!==dragging.col));setDragging(null)}
 function movePointer(e:React.PointerEvent){if(!dragging)return;e.preventDefault();setDragPoint({x:e.clientX,y:e.clientY})}
 function endPointer(e:React.PointerEvent){
  if(!dragging)return
  const target=document.elementFromPoint(e.clientX,e.clientY) as HTMLElement|null
  const cell=target?.closest<HTMLElement>('[data-cell]')
  if(cell){dropOnBoard(Number(cell.dataset.row),Number(cell.dataset.col));return}
  if(target?.closest(`[data-rack="${game.active}"]`)){returnToRack();return}
  setDragging(null)
 }
 function confirm(){
  if(!check.input||!check.result.valid)return
  const input=check.input,result=check.result
  setGame(old=>{const n=clone(old);n.undo.push(snapshot(old));const id=(n.moves.at(-1)?.id??0)+1
   for(const p of result.placements.filter(x=>x.isNew))n.board[p.row][p.col]={letter:p.letter,owner:p.owner,moveId:id}
   const used=result.placements.filter(x=>x.isNew).map(x=>x.letter)
   const cycleResult=useLetters(n.players[game.active],used)
   const totalScore=result.score+cycleResult.bonus
   n.players[game.active]={...cycleResult.player,score:n.players[game.active].score+totalScore}
   n.moves.push({id,player:game.active,...input,placements:result.placements,words:result.words,score:totalScore,baseScore:result.score,bonus:cycleResult.bonus})
   n.active=(game.active===0?1:0);n.turn++;n.noMove=[];return n})
  setTentative([])
 }
 function pass(forced=false){if(!forced&&legal)return;setGame(old=>{const n=clone(old);n.undo.push(snapshot(old));if(!n.noMove.includes(n.active))n.noMove.push(n.active);n.passes.push({player:n.active,turn:n.turn,forced,time:new Date().toLocaleTimeString()});if(n.noMove.length===2)n.status='over';else{n.active=(n.active===0?1:0);n.turn++}return n});setTentative([])}
 function undo(){setGame(old=>{const prior=old.undo.at(-1);if(!prior)return old;return {...clone(prior),undo:old.undo.slice(0,-1)}});setTentative([])}
 function newGame(){setGame(createGame());setTentative([])}
 function mutate(fn:(n:GameState)=>void){setGame(old=>{const n=clone(old);n.undo.push(snapshot(old));fn(n);return n});setTentative([])}
 const winner=game.players[0].score===game.players[1].score?'Tie game':`${game.players[game.players[0].score>game.players[1].score?0:1].name} wins`

 function Rack({id}:{id:PlayerId}){
  const p=game.players[id],active=id===game.active&&game.status==='playing'
  const placed=new Set(tentative.map(x=>x.letter))
  return <aside data-rack={id} className={`rack player-${id} ${active?'active':''}`}>
   <div className="rack-head"><p>{p.name}</p><strong>{p.score}</strong><span>POINTS</span></div>
   <div className="rack-meta"><span>Alphabet {p.cycle} · Vowels {p.vowelCycle}</span><b>{p.available.length} tiles</b></div>
   <div className="pool-status"><span>{VOWELS.filter(v=>p.available.includes(v)).length} vowels</span><span>{p.available.filter(v=>!VOWELS.includes(v)).length} consonants</span></div>
   <div className="tile-rack">{ALPHABET.map(letter=>{const available=p.available.includes(letter),onBoard=active&&placed.has(letter);return <div className="tile-slot" key={letter}>{available&&!onBoard?<button className={`letter-tile stone-${id}`} disabled={!active} onPointerDown={e=>{if(active){e.preventDefault();startDrag(letter,e.clientX,e.clientY)}}}><span>{letter}</span></button>:<span className="empty-tile">{letter}</span>}</div>})}</div>
   <div className="rack-status">{game.status==='over'?'Finished':active?'DRAG TILES TO THE BOARD':'WAITING'}</div>
  </aside>
 }

 return <div className={`app ${dragging?'is-dragging':''}`} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={()=>setDragging(null)}>
  <header><div className="brand"><img src={`${import.meta.env.BASE_URL}torie-title.png`} alt="Torie"/></div></header>
  <main className="table">
   <Rack id={0}/>
   <section className="play-area">
    <div className="board-card">
     <div className="board-toolbar"><button className="how-button" onClick={()=>setShowHow(true)}>How to play</button><span className="legend"><i className="p1"/>P1 <i className="p2"/>P2 <i className="new"/>Current move</span></div>
     <div className="board-wrap"><div className="board" style={{gridTemplateColumns:`repeat(${BOARD_SIZE},32px)`}}>{Array.from({length:BOARD_SIZE},(_,r)=><div key={r} style={{display:'contents'}}>{Array.from({length:BOARD_SIZE},(_,c)=>{const cell=game.board[r][c],pending=tentative.find(x=>x.row===r&&x.col===c);return <div data-cell data-row={r} data-col={c} aria-label={`Row ${r+1}, column ${c+1}`} className={`cell ${CENTERS.has(`${r},${c}`)?'center':''} ${cell?`filled owner-${cell.owner}`:''} ${cell?.moveId===lastId?'last':''} ${pending?'tentative':''}`}>{pending?<button className={`letter-tile board-tile stone-${game.active}`} onPointerDown={e=>{e.preventDefault();startDrag(pending.letter,e.clientX,e.clientY,r,c)}}><span>{pending.letter}</span></button>:cell?<div className={`letter-tile placed-tile stone-${cell.owner}`}><span>{cell.letter}</span></div>:null}</div>})}</div>)}</div></div>
    </div>
    <section className="move-bar">
     <div className="move-state"><span className={check.result.valid?'ready':'waiting'}>{check.result.valid?'MOVE READY':'BUILD YOUR MOVE'}</span><strong>{check.result.valid?`${check.result.words.map(w=>w.word).join(' · ')}  |  +${check.result.score}${prospectiveCycle.bonus?' + 10 CYCLE CLEAR':''}`:check.result.errors[0]}</strong></div>
     <div className="move-actions"><button onClick={()=>setTentative([])} disabled={!tentative.length}>Cancel</button><button className="submit" onClick={confirm} disabled={!check.result.valid}>Submit move</button></div>
    </section>
    <section className="game-strip">
     <div><h3>Recent play</h3>{game.moves.at(-1)?<p>{game.players[game.moves.at(-1)!.player].name}: {game.moves.at(-1)!.words.map(w=>w.word).join(', ')} <b>+{game.moves.at(-1)!.baseScore}{game.moves.at(-1)!.bonus?` + ${game.moves.at(-1)!.bonus} cycle clear`:''}</b></p>:<p>No moves yet</p>}</div>
     <div className="utility"><button onClick={()=>pass(false)} disabled={Boolean(legal)}>Pass</button><button onClick={undo} disabled={!game.undo.length}>Undo</button><button onClick={newGame}>New game</button></div>
    </section>
   </section>
   <Rack id={1}/>
  </main>
  <section className="dev"><button className="dev-title" onClick={()=>setDevOpen(x=>!x)}>Development tools <span>{devOpen?'−':'+'}</span></button>{devOpen&&<div className="dev-body"><label className="toggle"><input type="checkbox" checked={allowAny} onChange={e=>setAllowAny(e.target.checked)}/> Allow any alphabetic word</label><div className="dev-grid"><div><button onClick={()=>pass(true)}>Force pass</button><button onClick={()=>mutate(n=>{n.board=createBoard();n.moves=[];n.noMove=[];n.status='playing'})}>Clear board</button><button onClick={()=>mutate(n=>{n.active=(n.active===0?1:0)})}>Switch player</button><button onClick={()=>mutate(n=>{n.board=createBoard();'TORIE'.split('').forEach((letter,i)=>n.board[7][5+i]={letter,owner:(i%2) as PlayerId,moveId:0});n.noMove=[];n.status='playing'})}>Fill test pattern</button></div>{game.players.map((p,i)=><label key={p.id}>{p.name} remaining<input value={letterSets[i]} onChange={e=>{const a=[...letterSets];a[i]=e.target.value.toUpperCase();setLetterSets(a)}}/><button onClick={()=>mutate(n=>{n.players[i].available=[...new Set(letterSets[i].match(/[A-Z]/g)??[])]})}>Apply</button></label>)}<label>Import / export<textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Game-state JSON"/><button onClick={()=>setImportText(JSON.stringify(snapshot(game),null,2))}>Export</button><button onClick={()=>{try{const x=JSON.parse(importText);setGame({...x,undo:[]});setTentative([])}catch{alert('That JSON could not be imported.')}}}>Import</button></label></div></div>}</section>
  {showHow&&<div className="how-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setShowHow(false)}}>
   <section className="how-modal" role="dialog" aria-modal="true" aria-labelledby="how-title">
    <button className="how-close" onClick={()=>setShowHow(false)} aria-label="Close how to play">×</button>
    <p className="how-kicker">How to Play</p>
    <h2 id="how-title">Your Words. Your Territory.</h2>
    <p>Torie is a game of words and strategy. Outscore your opponent while controlling the board—and be careful not to leave yourself without room to play.</p>
    <p>Build connected words by dragging your tiles onto the board, crossword style.</p>
    <h3>Use. Reset. Repeat.</h3>
    <p>You begin with one of every letter.</p>
    <ul><li>Use all five vowels and your vowels reset.</li><li>Use all your consonants and your full alphabet resets.</li></ul>
    <div className="game-changer"><h3>Game Changer</h3><p>Clear your vowels and consonants in the same move for a game-changing 10-point bonus.</p></div>
    <p>Every new tile scores 1 point, so plan ahead. The best move might not be the longest word—it might be the move that controls the board, prepares your next reset, or blocks your opponent.</p>
    <p>If you have no legal move, you can pass. You may be able to play again after the board changes.</p>
    <p className="how-ending">The game ends when there are no more moves. Highest score wins.</p>
   </section>
  </div>}
  {dragging&&<div className={`drag-ghost letter-tile stone-${game.active}`} style={{left:dragPoint.x,top:dragPoint.y}}><span>{dragging.letter}</span></div>}
  {game.status==='over'&&<div className="gameover"><div><p>NO MOVES REMAIN</p><h2>{winner}</h2><strong>{game.players[0].score} — {game.players[1].score}</strong><button onClick={newGame}>Play again</button></div></div>}
 </div>
}
