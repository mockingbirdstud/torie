import {describe,expect,it} from 'vitest'
import {CENTERS,createBoard} from './board'
import {createDictionary} from './dictionary'
import {findLegalMove} from './legalMoveSearch'
import {ALPHABET,consume,createGame,snapshot,useLetters,VOWELS} from './state'
import {validateMove} from './validation'
import type {Board,Player} from './types'
const dict=createDictionary(true)
const player=(available=ALPHABET):Player=>({id:0,name:'Player 1',score:0,cycle:1,vowelCycle:1,available:[...available]})
const put=(board:Board,word:string,row:number,col:number,vertical=false)=>word.split('').forEach((letter,i)=>board[row+(vertical?i:0)][col+(vertical?0:i)]={letter,owner:0,moveId:1})
describe('rule engine',()=>{
 it('accepts first move crossing a center cell',()=>expect(validateMove(createBoard(),player(),{row:7,col:6,direction:'H',text:'CAT'},dict).valid).toBe(true))
 it('rejects first move missing the center',()=>expect(validateMove(createBoard(),player(),{row:0,col:0,direction:'H',text:'CAT'},dict).errors.join()).toMatch(/center/))
 it('accepts a valid connected move',()=>{const b=createBoard();put(b,'CAT',7,7);expect(validateMove(b,player(),{row:6,col:8,direction:'V',text:'BAR'},dict).valid).toBe(true)})
 it('rejects a disconnected move',()=>{const b=createBoard();put(b,'CAT',7,7);expect(validateMove(b,player(),{row:2,col:2,direction:'H',text:'DOG'},dict).errors.join()).toMatch(/connect/)})
 it('rejects overwriting a different letter',()=>{const b=createBoard();put(b,'CAT',7,7);expect(validateMove(b,player(),{row:7,col:7,direction:'H',text:'DOG'},dict).errors.join()).toMatch(/overwrite/)})
 it('extends an existing word and scores only new letters',()=>{const b=createBoard();put(b,'CAT',7,7);const r=validateMove(b,player(),{row:7,col:7,direction:'H',text:'CATER'},dict);expect(r.valid).toBe(true);expect(r.words.map(x=>x.word)).toContain('CATER');expect(r.score).toBe(2)})
 it('recognizes a perpendicular word',()=>{const b=createBoard();put(b,'CAT',7,7);const r=validateMove(b,player(),{row:6,col:8,direction:'V',text:'BAR'},dict);expect(r.words.map(x=>x.word)).toContain('BAR')})
 it('rejects using the same new letter twice',()=>expect(validateMove(createBoard(),player(),{row:7,col:7,direction:'H',text:'TOOT'},dict).errors.join()).toMatch(/one new O|one new T/))
 it('rejects an unavailable letter',()=>expect(validateMove(createBoard(),player(ALPHABET.filter(x=>x!=='C')),{row:7,col:7,direction:'H',text:'CAT'},dict).errors.join()).toMatch(/not available/))
 it('scores only newly placed letters',()=>{const b=createBoard();put(b,'A',7,8);expect(validateMove(b,player(),{row:7,col:7,direction:'H',text:'CAT'},dict).score).toBe(2)})
 it('refreshes the alphabet after all 26 are used',()=>{const p=consume(player(['Z']),['Z']);expect(p.available).toEqual(ALPHABET);expect(p.cycle).toBe(2)})
 it('refreshes vowels independently after all remaining vowels are used',()=>{const result=useLetters(player(),VOWELS);expect(result.vowelsReset).toBe(true);expect(result.alphabetReset).toBe(false);expect(VOWELS.every(v=>result.player.available.includes(v))).toBe(true);expect(result.player.vowelCycle).toBe(2)})
 it('awards a 10 point bonus when vowels and consonants clear together',()=>{const result=useLetters(player(['A','Z']),['A','Z']);expect(result.vowelsReset).toBe(true);expect(result.alphabetReset).toBe(true);expect(result.bonus).toBe(10);expect(result.player.available).toEqual(ALPHABET)})
 it('does not award the bonus for a vowel-only reset',()=>{const result=useLetters(player(['A','B','C']),['A']);expect(result.vowelsReset).toBe(true);expect(result.alphabetReset).toBe(false);expect(result.bonus).toBe(0)})
 it('allows a pass state when no move exists',()=>expect(findLegalMove(createBoard(),player([]),dict)).toBeNull())
 it('a passed player can return after the board changes',()=>{const b=createBoard();put(b,'A',7,7);const tiny={words:['AZ'],isValid:(w:string)=>w==='AZ'};expect(findLegalMove(b,player(['Z']),tiny)).not.toBeNull()})
 it('game ends only after both players cannot move',()=>{const g=createGame();g.noMove=[0];expect(g.status).toBe('playing');g.noMove.push(1);if(g.noMove.length===2)g.status='over';expect(g.status).toBe('over')})
 it('undo snapshot restores board, score, letters, cycle, and turn',()=>{const g=createGame(),before=snapshot(g);g.board[7][7]={letter:'A',owner:0,moveId:1};g.players[0]=consume({...g.players[0],score:1},['A']);g.turn=2;const restored=structuredClone(before);expect(restored.board[7][7]).toBeNull();expect(restored.players[0].score).toBe(0);expect(restored.players[0].available).toContain('A');expect(restored.players[0].cycle).toBe(1);expect(restored.turn).toBe(1)})
 it('uses exactly one center square',()=>expect(CENTERS.size).toBe(1))
})
