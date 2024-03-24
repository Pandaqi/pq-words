import PandaqiWords from "./main"

// This is just the simple dictionary tool on my website I created in an hour
// @SOURCE: https://pandaqi.com/tools/dictionary/
const inp = document.getElementById('input-word') as HTMLInputElement;
const btn = document.getElementById("check-btn") as HTMLButtonElement;
const results = document.getElementById("lookup-result") as HTMLElement;

const pqWords = new PandaqiWords();

function performSearch(word:string)
{
    const fuzziness = 1;
    const maxFuzzyMatches = 4;
    const res = pqWords.findWord(word, fuzziness, maxFuzzyMatches);

    let str = "<p>The word <span class='word'>" + word + "</span>"  
    let strMetadata = "";
    if(!res.success) {
        // @ts-ignore
        results.classList = 'result-fail';
        str += ' is <strong>not</strong>';

        let options = res.matches;
        if(options.length > 0) { 
            strMetadata += "<span class='word-metadata'>Maybe you meant "; 
            for(let i = 0; i < options.length; i++)
            {
                let delimiter = ", ";
                if(i == 0) { delimiter = ""; }
                if(i == (options.length - 1) && i > 0) { delimiter = " or "}
                strMetadata += delimiter + options[i].getWord();
            }

            strMetadata += "?</span>";
        }

    } else {
        // @ts-ignore
        results.classList = 'result-success';
        str += ' is';
        
        let metadata = res.matches[0].getMetadata();
        strMetadata = "<span class='word-metadata'>(" + metadata.prettyPrint() + ")</span>";
    }
    str += " in the dictionary.";
    str += strMetadata;
    str += "</p>";

    results.innerHTML = str;
    results.style.display = 'block';

    btn.innerHTML = "Check!";
}

btn.addEventListener("click", async (ev) => {
    const maxWordLength = 24;
    const wordToCheck = inp.value;
    const wordSanitized = wordToCheck.toLowerCase().trim().slice(0, maxWordLength);
    if(!wordSanitized) { return; }

    btn.innerHTML = "... searching ...";
    await pqWords.loadWithParams({ useAll: true, method: "json" })

    setTimeout(() => performSearch(wordSanitized), 10);
});

// @ts-ignore
window.PQ_WORDS = pqWords;