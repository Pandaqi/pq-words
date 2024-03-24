import WordMetadata from "./wordMetadata"

export default class WordData 
{
    word: string;
    metadata: WordMetadata;

    constructor()
    {
        this.word = "";
        this.metadata = null;
    }

    is(word:string) { return this.word == word; }
    setWord(word:string) { this.word = word; }
    getWord() { return this.word; }
    setMetadata(md:WordMetadata) {  this.metadata = md; }
    getMetadata() { return this.metadata; }
}