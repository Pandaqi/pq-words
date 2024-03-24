import WordData from "./wordData"
import WordMetadata from "./wordMetadata"

export default class WordDataList 
{
    words: string[];
    metadata: WordMetadata;

    constructor() 
    {
        this.words = [];
        this.metadata = null;
    }

    setMetadata(md:WordMetadata) { this.metadata = md; }
    setWords(words:string[]) { this.words = words; }
    splitWordsIntoSeparateEntries()
    {
        const arr = [];
        for(const wordData of this.words)
        {
            const data = new WordData();
            data.setWord(wordData);

            const md = new WordMetadata();
            data.setMetadata(this.metadata);
            arr.push(data);
        }
        return arr;
    }
}