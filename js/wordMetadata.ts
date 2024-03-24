export default class WordMetadata 
{
    type: string;
    level: string;
    cat: string;
    subcat: string;

    set(type: string, level: string, cat: string, subcat: string)
    {
        this.type = type;
        this.level = level;
        this.cat = cat;
        this.subcat = subcat;
    }

    setFromObject(obj)
    {
        this.set(obj.type, obj.level, obj.cat, obj.subcat);
    }

    getCategory()
    {
        return this.cat
    }

    getSubCategory()
    {
        return this.subcat;
    }

    getFullCategory(nice = true)
    {
        let str = this.cat
        if(this.subcat != "general") { 
            if(nice) { str += " (" + this.subcat + ")"; }
            else { str += "_" + this.subcat; }
        }
        return str;
    }

    prettyPrint()
    {
        return [this.type, this.level, this.cat, this.subcat].join(", ");
    }
}