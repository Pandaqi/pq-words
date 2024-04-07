import WordMetadata from "./wordMetadata";
import WordData from "./wordData";
import WordDataList from "./wordDataList";

const CATEGORIES =
{
    geography: ["cities", "countries", "locations", "planets"],
    names: ["business", "clothes", "creative_gaming", "creative_visual", "creative_writing", "digital", "food", "holidays", "items_appliances", "music", "people", "religion", "science", "sports", "travel", "vehicles", "general"],
    nouns: ["anatomy", "animals", "animals_birds", "animals_farm", "animals_insects", "animals_pets", "business", "clothes", "colors", "continents", "creative_gaming", "creative_visual", "creative_writing", "digital", "events", "food", "food_beverages", "food_fruit", "food_sweets", "general", "holidays", "items", "items_appliances", "items_furniture", "items_household", "items_substances", "items_tools", "items_toys", "military", "music", "music_theory", "nature", "nature_weather", "occupations", "people", "places", "places_architecture", "places_inside",  "religion", "science", "science_chemistry", "science_physics", "shapes", "sports", "time", "travel", "vehicles"],
    adverbs: ["certainty", "conjunctive", "degree", "frequency", "interrogative", "manner", "place", "relative", "time"],
    adjectives: ["age", "article", "character", "color", "comparative", "demonstrative", "difference", "distributive", "emotions", "material", "numbers", "opinion", "origin", "possessive", "predeterminer", "quantifier", "ranking", "shape", "size", "superlative", "technology","temperature" ],
    verbs: ["auxiliary", "basic", "dynamic", "intransitive", "linking", "movement", "phrasal", "stative", "transitive", "communication", "feelings"],
    pronouns: ["pronouns"],
    prepositions: ["movement", "place", "time"]
}

const ALL_CATEGORIES = new Set();
for(const [key,data] of Object.entries(CATEGORIES))
{
    for(const val of data)
    {
        ALL_CATEGORIES.add(val);
    }
}

interface Query 
{
    cat?:string
    subcat?:string
    type?:string
    level?:string
}

interface LoadParams
{
    path?: string;
    useAll?: boolean;
    types?: string[];
    levels?: string[];
    categories?: string[];
    useAllLevelsBelow?: boolean;
    useAllCategories?: boolean;
    useAllSubcat?: boolean;
    typeExceptions?: string[];
    categoryExceptions?: string[];
    method?: string;
    minWordLength?:number
    maxWordLength?:number
}

class PandaqiWords {

    jsonCache:Record<string,any> = {}
    txtCache:Record<string,any> = {}
    list:WordData[] = []
    
    allCategories = Array.from(ALL_CATEGORIES) as string[]
    defaultCategories = ["animals", "food", "places", "items"]
    allLevels = ["core", "easy", "medium", "hard", "hardcore"]
    defaultLevel = ["easy"]
    allTypes = ["nouns", "geography", "names", "adjectives", "verbs", "adverbs", "pronouns", "prepositions"]
    defaultType = ["nouns"]

    defSubcat = "general"
    listIndex: Record<string,any>;

    getTxtFilePath(path:string, query:Query)
    {
        let fileName = query.cat;
        if(query.subcat.length > 0 && query.subcat != this.defSubcat) { fileName += "_" + query.subcat; }
        return path + "/" + query.type + "/" + query.level + "/" + fileName + ".txt";
    }

    getJsonFilePath(path:string, _query:Query = {})
    {
        return path + "/lib-pqWords.json";
    }

    // @NOTE: Can print this directly to the console with something like
    // PQ_WORDS.getWordCount().then((res) => console.log(res));
    async getWordCount(allWords = true)
    {
        if(allWords) { await this.loadWithParams({ useAll: true, method: "json" }); }
        return this.recursiveWordCount(this.jsonCache);
    }

    recursiveWordCount(data)
    {
        if(Array.isArray(data)) { return data.length; }
        if(typeof data == 'object') { 
            let sum = 0;
            for(const key in data)
            {
                sum += this.recursiveWordCount(data[key]);
            }
            return sum
        }
        return 0;
    }

    addToTxtCache(key:string, data:WordDataList)
    {
        this.txtCache[key] = data;
    }

    hasFileCached(key:string)
    {
        return (key in this.txtCache);
    }

    constructListFromKeys(keys:string[], params:LoadParams = {})
    {
        this.list = [];
        for(const key of keys)
        {
            const allData = this.txtCache[key];
            if(!allData) { continue; }

            const words = allData.splitWordsIntoSeparateEntries();
            for(const word of words)
            {
                if(word.length < params.minWordLength) { continue; }
                if(word.length > params.maxWordLength) { continue; }
                this.list.push(word);
            }
        }

        if(this.list.length <= 0) { console.error("PQ_WORDS: Word list is empty"); }
    }

    // @IMPROV: is there are more neat/general way to implement this? Also for "convertListToHierarchy"?
    constructListFromQueries(queries:Query[], params:LoadParams = {})
    {
        this.list = [];
        for(const query of queries)
        {
            const t = query.type, l = query.level, c = query.cat, s = query.subcat;
            if(!this.safeCheckHierarchy(this.jsonCache, [t,l,c,s])) { continue; }

            const allData = this.jsonCache[t][l][c][s];
            const md = new WordMetadata();
            md.setFromObject(query);

            for(const word of allData)
            {
                if(word.length < params.minWordLength) { continue; }
                if(word.length > params.maxWordLength) { continue; }

                const wordData = new WordData();
                wordData.setWord(word);
                wordData.setMetadata(md);
                this.list.push(wordData);
            }
        }

        if(this.list.length <= 0) { console.error("PQ_WORDS: Word list is empty"); }
    }

    // Checks if all keys we want to access exist (in the given order, hence _hierarchy_)
    // Creates them if `create`=true, otherwise just breaks out
    safeCheckHierarchy(obj, keys, create = false)
    {
        const isMapGeneral = (obj instanceof Map);

        for(let i = 0; i < keys.length; i++)
        {
            const key = keys[i];
            const isMap = (obj instanceof Map);
            const isObject = (obj instanceof Object);

            const hasKey = isMap ? obj.get(key) != undefined : (key in obj);
            if(hasKey) { 
                obj = isMap ? obj.get(key) : obj[key];
                continue; 
            }

            if(!create) { return false; }
            
            if(isMap) { obj.set(key, new Map()); }
            else { obj[key] = {}; }
        
            const isLastKey = i >= (keys.length - 1);
            if(isLastKey) { 
                if(isMap) { obj.set(key, []); }
                else { obj[key] = [] }; 
            }

            if(isMap) { obj = obj.get(key); }
            else { obj = obj[key]; }
            
        }
        return true;
    }

    setInHierarchy(obj, keys, val)
    {
        for(let i = 0; i < keys.length; i++)
        {
            const key = keys[i];
            if(i == (keys.length - 1)) { obj.set(key, val); }
            else { obj = obj.get(key); }
        }
    }

    getInHierarchy(obj, keys)
    {
        for(let i = 0; i < keys.length; i++)
        {
            const key = keys[i];
            if(obj.get(key) == undefined) { return null; }
            obj = obj.get(key);
        }
        return obj;
    }

    convertListToIndex()
    {
        const obj = new Map();
        for(const wordData of this.list)
        {
            const word = wordData.getWord();
            const wordSplit = word.toLowerCase().split("")
            wordSplit.push("");
            this.safeCheckHierarchy(obj, wordSplit, true);
            this.setInHierarchy(obj, wordSplit, wordData);
        }
        return obj;
    }

    convertListToHierarchy()
    {
        const obj = {};
        for(const wordData of this.list)
        {
            const t = wordData.metadata.type, l = wordData.metadata.level, c = wordData.metadata.cat, s = wordData.metadata.subcat;
            this.safeCheckHierarchy(obj, [t,l,c,s], true);

            const actualWord = wordData.word;
            obj[t][l][c][s].push(actualWord);
        }
        return obj;
    }

    getAll()
    {
        return this.list;
    }

    // "Reverse levenshtein distance"
    // (Generates all strings within distance X from an input string)
    // (For high fuzziness, not great for performance. But then you'll need a better system anyway.)
    ltDistanceReverse(a = "", fuzziness = 0, partials = true)
    {
        if(a == "") { return []; }
        if(fuzziness < 0) { return []; }
        return this.ltDistanceRecursiveReverse(a, a, fuzziness, partials);
    }

    ltDistanceRecursiveReverse(original, a, fuzziness, partials)
    {
        if(fuzziness <= 0) { return [a]; }

        // perform deletion
        const arr = [];
        for(let i = 0; i < a.length+1; i++)
        {
            const str = a.slice(0, i) + a.slice(i + 1);
            if(fuzziness > 1 && partials) { arr.push(str); }
            arr.push(this.ltDistanceRecursiveReverse(original, str, fuzziness - 1, partials));
        }

        for(let c = 0; c < 26; c++)
        {
            const char = Math.floor(c + 10).toString(36);
            
            // @OPTIMIZATION: if new string same as original, no point continuing from here
            for(let i = 0; i < a.length+1; i++)
            {
                // perform addition
                let str = a.slice(0, i) + char + a.slice(i);
                if(str != original) {
                    if(fuzziness > 1 && partials) { arr.push(str); }
                    arr.push(this.ltDistanceRecursiveReverse(original, str, fuzziness - 1, partials));
                }

                // perform swap
                // @OPTIMIZATION: swap with the same letter is no swap at all
                if(i >= a.length) { continue; }
                if(char == a[i]) { continue; }

                str = a.slice(0, i) + char + a.slice(i+1);
                if(str != original)
                {
                    if(fuzziness > 1 && partials) { arr.push(str); }
                    arr.push(this.ltDistanceRecursiveReverse(original, str, fuzziness - 1, partials));
                }
                
            }
        }

        return arr.flat();
    }


    // "Levenshtein Distance"
    ltDistance(a, b, fuzziness)
    {
        if(Math.abs(a.length - b.length) > fuzziness) { return Infinity; }
        return this.ltDistanceRecursive(a, b, a.length + 1, b.length + 1);
    }

    ltDistanceRecursive(a,b,i,j)
    {
        if(Math.min(i,j) == 0) { return Math.max(i,j); }

        const val1 = this.ltDistanceRecursive(a,b,i-1,j) + 1;
        const val2 = this.ltDistanceRecursive(a,b,i,j-1) + 1;
        let val3 = this.ltDistanceRecursive(a,b,i-1,j-1);
        const characterNotEqual = (a[i] != b[j])
        if(characterNotEqual) { val3 += 1; }

        return Math.min(val1, val2, val3);
    }

    findWord(word, fuzziness = 0, maxMatches = 4)
    {
        if(!this.listIndex) { this.listIndex = this.convertListToIndex(); }
        
        const wordSplit = word.split("");
        wordSplit.push(""); // the last character empty means we want a leaf = terminal node = full word
        const res = this.getInHierarchy(this.listIndex, wordSplit);
        if(res != null) {  return { success: true, matches: [res] } }
        if(fuzziness == 0) {  return { success: false, matches: [] } }

        const matches = [];
        const fuzzyWords = this.ltDistanceReverse(word, fuzziness);
        for(const fuzzyWord of fuzzyWords)
        {
            const fuzzyWordSplit = fuzzyWord.split("");
            fuzzyWordSplit.push("");
            const res = this.getInHierarchy(this.listIndex, fuzzyWordSplit);
            if(res == null) { continue; }
            if(matches.includes(res)) { continue; }

            matches.push(res);
            if(matches.length >= maxMatches) { break; }
        }

        return { success: false, matches: matches }
    }

    getRandomMultiple(num = 10, remove = false)
    {
        const arr = [];
        for(let i = 0; i < num; i++)
        {
            const val = this.getRandom(remove);
            if(val == null) { break; }
            arr.push(val);
        }
        return arr;
    }

    getRandom(remove = false)
    {
        if(this.list.length <= 0) { return null; }

        const idx = Math.floor(Math.random() * this.list.length);
        const val = this.list[idx];
        if(remove) { this.list.splice(idx, 1); }
        return val;
    }

    getAllSubcategories(cat)
    {
        const arr = [];
        for(const otherCat of this.allCategories)
        {
            if(!otherCat.includes(cat)) { continue; }
            if(cat == otherCat) { continue; }
            arr.push(otherCat);
        }
        return arr;
    }

    async loadAll()
    {
        await this.loadWithParams({ useAll: true, method: "txt" });
    }

    async loadWithParams(params:LoadParams = {})
    {
        const path = params.path || "/words";
        if(path.charAt(path.length-1) == "/") { path.slice(0, -1); }

        // first, collect all parameters and modify them accordingly (or set defaults)
        if(params.useAll)
        {
            params.types = this.allTypes;
            params.levels = this.allLevels;
            params.categories = this.allCategories;
            params.useAllSubcat = true;
        }

        params.minWordLength = params.minWordLength || 0;
        params.maxWordLength = params.maxWordLength || 50;

        const types = params.types || this.defaultType;
        const levels = params.levels || this.defaultLevel;
        if(params.useAllLevelsBelow)
        {
            const idx = this.allLevels.indexOf(params.levels[0]);
            for(let i = 0; i < idx; i++)
            {
                levels.push(this.allLevels[i]);
            }
        }

        const defaultCategories = params.useAllCategories ? this.allCategories : this.defaultCategories;
        let categories = defaultCategories;
        let specificCategoriesSet = params.categories && params.categories.length > 0;
        let useSpecificCategories = specificCategoriesSet && !params.useAllCategories;
        if(useSpecificCategories) { categories = params.categories.slice(); }

        if(params.useAllSubcat)
        {
            for(const cat of categories)
            {
                for(const subcat of this.getAllSubcategories(cat))
                {
                    categories.push(subcat);
                }
            }
        }

        const typeExceptions = params.typeExceptions || [];
        const categoryExceptions = params.categoryExceptions || [];

        // generate the list of all combinations (level, type, cat, ...) we want to have
        const queryList = [];
        for(const type of types)
        {
            const isTypeException = (type in typeExceptions);
            if(isTypeException) { continue; }

            const relevantCategories = [];
            for(const cat of categories)
            {
                if(!CATEGORIES[type].includes(cat)) { continue; }
                relevantCategories.push(cat);
            }

            for(const level of levels)
            {
                for(const cat of relevantCategories)
                {
                    let mainCat = cat, subCat = this.defSubcat;
                    if(cat.includes("_"))
                    {
                        mainCat = cat.split("_")[0];
                        subCat = cat.split("_")[1];
                    }

                    const isException = (mainCat in categoryExceptions) || (subCat in categoryExceptions);
                    if(isException) { continue; }

                    queryList.push({ type: type, level: level, cat: mainCat, subcat: subCat });
                }
            }
        }

        // then simply get that list using the preferred method
        const method = params.method || "json";

        if(method == "json"){
            await this.loadJsonWithQueries(path, queryList, params);
        } else if(method == "txt") {
            await this.loadTxtWithQueries(path, queryList, params);
        }
    }

    async loadJsonWithQueries(path:string, queryList:Query[], params:LoadParams)
    {

        if(!this.jsonFileLoaded())
        {
            await this.loadJsonFile(this.getJsonFilePath(path));
        }

        this.constructListFromQueries(queryList, params);
    }

    async loadTxtWithQueries(path:string, queryList:Query[], params:LoadParams)
    {
        const promises :Promise<any>[] = [];
        const keys = [];
        for(const query of queryList)
        {
            const filePath = this.getTxtFilePath(path, query);
            
            const md = new WordMetadata();
            md.setFromObject(query);

            const data = new WordDataList();
            data.setMetadata(md);
            keys.push(filePath);

            if(this.hasFileCached(filePath)) { continue; }
            promises.push(this.loadTxtFile(filePath, data));
        }

        await Promise.all(promises);
        this.constructListFromKeys(keys, params);
    }

    async fileExists(url:string) 
    {
        const req = new XMLHttpRequest();
        return new Promise((resolve, reject) => {
            req.open('HEAD', url);
            req.onerror = () => { resolve(false); }
            req.onload = () => {
                resolve(req.status !== 404);
            };
            req.send();
        });        
    }

    parseTxtFile(data:string)
    {
        const arr = data.split(/[\r\n]+/);
        // this just filters out any empty lines (or too-short-words)
        for(let i = arr.length-1; i >= 0; i--)
        {
            if(arr[i].length >= 2) { continue; }
            arr.splice(i, 1);
        }
        return arr;
    }

    async loadTxtFile(filePath:string, wordData:WordDataList)
    {   
        console.log("Checking file at ", filePath);

        const fileExists = await this.fileExists(filePath);
        if(!fileExists) { return Promise.resolve(); }

        const that = this;
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', filePath);

            xhr.onerror = () => { resolve(false); }
            xhr.onloadend = () => {
                if(xhr.status == 404) { resolve(false); return; }
                if(xhr.status == 200) {
                    const parsedData = this.parseTxtFile(xhr.response);
                    wordData.setWords(parsedData);
                    that.addToTxtCache(filePath, wordData);
                    resolve(true);
                }
            };

            xhr.send();
        });
    }

    // @IMPROV: slightly duplicate code compared to loadTxtFile; is it necessary to generalize/merge that?
    async loadJsonFile(filePath:string)
    {
        const that = this;
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', filePath);
            xhr.onerror = (ev) => { resolve(false); }
            xhr.onloadend = () => {
                if(xhr.status == 404) { resolve(false); return; }
                if(xhr.status == 200) {
                    that.jsonCache = JSON.parse(xhr.response);
                    resolve(true);
                }
            };
            xhr.send();
        });
    }
    
    jsonFileLoaded()
    {
        return Object.keys(this.jsonCache).length > 0;
    }

    async getAllAsJSON()
    {
        await this.loadAll();
        console.log(this.convertListToHierarchy());
    }

    printAllCategories(excludeSubcat = true, joiner = ",")
    {
        const arr = []
        for(const cat of this.allCategories)
        {
            const isSubcat = cat.includes("_");
            if(excludeSubcat && isSubcat) { continue; }
            arr.push(cat);
        }
        return arr.join(joiner);
    }
}

export default PandaqiWords;