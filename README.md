---
title: "PQ_WORDS: A dictionary for games"
---

I made a thing! One that others might like as well: a library of **word lists**. Use them for word games. Use them to quickly prototype new ideas or generate random words / concepts for inspiration. Use them for a spelling contest. Use them however you like!

You can find the project on GitHub: \<@TODO: Link\>

You can see it in effect in a game like [That's Amorphe](https://pandaqi.com/thats-amorphe). On the website, you can generate a PDF with word cards, which you can print and use for playing. Those words are, obviously, drawn directly from these word lists.

It also powers my [Dictionary Tool](https://pandaqi.com/tools/dictionary/). It's useful when you play one of my word games---like [Keebble](https://pandaqi.com/keebble)---to check _if something is a valid word_. You know, the thing that starts all lively discussions in Scrabble-like games :p

## What is it?

* English words
* Separated by **word type** (nouns, verbs, ...)
* Then by **complexity** (easy, medium, hard)
* And then by **category** (animals, places, occupations, ...)
* Inside `.txt` files

This is not an exhaustive list. The library will grow as I make more of these games and refine the lists.

I split _geography_ and _proper names_ into their own word types. Some players don't like having real-life names in games like these, or a project can't use them. Including them with the _nouns_ has more cons than pros. (They are also most likely to be unknown or outdated.)

## Usage

You can use this any way you like. But it was mostly meant to be used in some digital system (such as a website), so I'll explain more about that below.

### Delivery

You can deliver the words as separate `.txt` files (loaded individually). Or you can use the JSON file that has _all_ data in it.

I've included a small JavaScript file to collect and query them. This "library" is called PQ_WORDS ( = Pandaqi Words). 

* Host the words on your server + the script
* First you _load_ the words. (This takes time. It's an _async_ request, wait for it.)
* Now you can query this list however you like.

Here's an example.

{{< highlight javascript >}}
async function getXRandomWords(num)
{
  const params = { "useAll": true }
  await PQ_WORDS.loadWithParams(params);
	
	const wordList = PQ_WORDS.getRandomMultiple(num);
    for(const wordData of wordList)
    {
        console.log(wordData.word);
    }
}

getXRandomWords();
{{< /highlight >}}

### PQ_WORDS

The most important functions are (all arguments optional) ...

* `loadWithParams(params)`: loads (and caches/combines) text files based on parameters you set
  * `method`: either `txt` or `json` (default), determines from where it loads the data 
  * `path`: a custom path to your words folder
  * `useAll` (boolean): if true, will load everything it has
  * `types` (string array; nouns): which types you want to load
  * `levels` (string array; easy): which complexity levels you want to load
  * `categories` (string array): which categories you want to load
  * `useAllSubcat` (boolean): if true, auto-includes subcategories of a general category
	* `useAllCategories` (boolean): if true, uses all known categories,
	* `useAllLevelsBelow` (boolean): if true, auto-includes lower difficulty levels up to the the one you chose
	* `typeExceptions` (string array): which types to exclude
	* `categoryExceptions` (string array): which category (or subcategory) to exclude
* `getRandom()`: gets a random word
* `getRandomMultiple(number)`: gets _number_ random words in a list
* `getAll()`: gets the entire list
* `findWord(word, fuzziness, maxMatches)`: finds a word. 
  * Fuzziness means how many characters you may be _off_. The search will "fail", but it provides near-matches. 

Word searching builds an index first to make this fast. It uses simple Levenshtein Distance and is quite rudimentary. (If you want seriously fast lookups, this won't be enough.)

### WordData

Words return as a WordData object, with interface ...

* `getWord()`: the actual word
* `getMetadata()`: returns an object with those metadata properties 
  * `type`: word type
  * `level`: word complexity level
  * `cat`: word category
  * `subcat`: word sub category (like animals > pets, "general" otherwise)

### Creating your own JSON

I used four simple steps. Surely it can be automated further, but I saw no need.

* Call `getAllAsJSON()` on PQ_WORDS => this prints the full word library in your console
* Right-click and choose "copy object"
* Paste it inside a JSON file and you're good to go!

Make sure you right-click the top-level object. Otherwise it'll store whatever sub object you clicked.

### Why text files?

They are very easy to open, edit, parse, search-and-replace, etcetera. On any system, with any software, without any delay. There's no overhead.

But requesting ten, twenty, fifty individual `.txt` files each time isn't great for (server) performance. That's why I also included an easy way to output/request as a single `.json` file.

The alternative was to create a database for this. But the pros didn't outweigh the cons. In general, I try to stay lean and only use a basic folder-file structure for systems. Others might scoff at my badly written JavaScript, but then again, I created this whole system in a week and it works wonders.

## Why?

I needed them for a number of (board) games. These ideas required you to draw or play with (random) words on your turn. For most of them, the words needed to be _very easy / common_ or within a _specific category_.

These games needed to be playable by children or people who didn't know that much English. These games are also "party" games, which certainly don't benefit from very complex words. (Nothing kills the fun like having to play with ten words nobody has ever seen.)

I scoured the internet but found nothing. Other word lists were ...

* Not in any usable format
* Too long, filled with words nobody actually knows or uses
* Not separated by type or category
* Inconsistent. They often had duplicates or inconsistent spelling / input
* (Simply ... incorrect? They invented words?)

So I spent a week, a few hours every evening, creating this library.

## Where do words come from?

I saved the word lists I liked the best. I copied all the words, then started designating them myself.

* What type of word is it?
* Do I deem it an easy, medium or hard word?
* Do I recognize a common theme among these words that I can turn into a category?

Remember that I lean towards the easy side. A word is put into the "hard" folder very quickly, if I think there's any chance people won't know what it means. (Or its meaning is too vague / abstract to use in a practical context, like a word association game.)

Words, therefore, come from about 10 different online sources. I also asked others to provide more, but their lists were usually too "specific", so not much of that was used. (They'd give me slang, brand names, inside jokes, or English words that Dutch people use but don't really mean what they think it means.)

Then I realized I was being stupid. I have several word (board) games at home! I can just look at their cards, translate to English, and use that. This was a huge revelation for me and greatly increased the quality of these word lists.

Once done, I went through all categories again and thought "Can I add something? Is there something I'm missing?"

After that, I had thousands of words and a brain that hurt from this project, so I called it quits.

### Can I propose changes?

Well, you can always send me a message (email, issue, whatever) and I'll see what I can do. But this is not an "active project": it grows and changes "behind the scenes" as I use it for more projects. So responses might be slow.

For your own purposes, of course, do whatever you want with this.

I've included a simple command-line tool (written in Rust) to easily update or modify the files, once downloaded to your local system.

* Place the `.exe` in the root of the words project
* Open a command line, move to that root

Now you can type `pqwordshelper `, followed by ...

* `-c readfile` => to read the content of a specific file
* `-c addword -w <word>` => to add a new word
* `-c createfile` => to create a new file
* `-c removeduplicates` => to both sort and remove unnecessary whitespace/duplicates
* `-c printvaluelist` => prints all possible categories in a list. (Similarly, `printvaluestring` prints them as a single string.) I copy the result of this to my JavaScript file to ensure it knows about all possible categories.

After typing the line, it asks you for the necessary info (one at a time): which category, what filename, etcetera.

It always creates a backup beforehand in a `_backup` folder. On top of that, I've added checks against corruption or accidental deletion---but still, use with caution.

(Yes, `c` for "command" and `-w` for word. It's my first command line tool---in Rust no less---go easy on me :p)