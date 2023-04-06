export default class WordDataList {
    constructor() 
    {
        this.words = [];
        this.metadata = null;
    }

    setMetadata(md) { this.metadata = md; }
    setWords(words) { this.words = words; }
    splitWordsIntoSeparateEntries()
    {
        const arr = [];
        for(const wordData of this.words)
        {
            const data = new PQ_WORDS.WordData();
            data.setWord(wordData);

            const md = new PQ_WORDS.WordMetadata();
            data.setMetadata(this.metadata);
            arr.push(data);
        }
        return arr;
    }
}