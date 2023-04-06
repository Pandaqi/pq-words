export default class WordData {
    constructor()
    {
        this.word = "";
        this.metadata = null;
    }

    is(word) { return this.word == word; }
    setWord(word) { this.word = word; }
    getWord() { return this.word; }
    setMetadata(md) {  this.metadata = md; }
    getMetadata() { return this.metadata; }
}