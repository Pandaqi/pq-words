use std::env;
use std::io::{stdin, stdout, Write};
use std::path::{Path, PathBuf};
use std::fs;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::fs::OpenOptions;

use fs_extra::dir::CopyOptions;
use fs_extra::copy_items;

type Keywords = HashMap<String, Vec<String>>;
type FileQuery = HashMap<String, String>;

fn get_filename_without_extension(filename: &str) -> Option<&str> {
    return Path::new(filename).file_stem().and_then(OsStr::to_str);
}

fn read_directory(config: &Config, path: &PathBuf, map: &mut HashMap<String, Vec<String>>, nesting: usize)
{   
    if nesting >= config.hierarchy_names.len() { return; }
    let hierarchy_name = config.hierarchy_names[nesting].to_string();

    let content = fs::read_dir(path).expect("Could not read path {path}");

    for dir in content
    {
        let inner_path:PathBuf = dir.expect("Could not read subdir").path();
        let metadata = fs::metadata(&inner_path).expect("Could not get metadata");

        if ignore_path(config, &inner_path) { continue; }

        let file_name = inner_path.file_name().unwrap();
        let file_name_string = file_name.to_str().unwrap(); // .into_os_string() before into_string()
        let file_name_no_ext = get_filename_without_extension(file_name_string).unwrap().to_owned();
        map.get_mut(&hierarchy_name).expect("Can't find hierarchy").push(file_name_no_ext);

        if metadata.is_dir()
        {
            read_directory(config, &inner_path, map, nesting + 1);
        } 
    }
}

fn capitalize(s: &String) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
    }
}

fn trim_newline(s: &mut String) {
    if s.ends_with('\n') {
        s.pop();
        if s.ends_with('\r') {
            s.pop();
        }
    }
}

fn ask_for(name: &String, valid_values: &Vec<String>, require_valid_values: bool) -> String
{
    let mut valid_value:bool = false;
    while !valid_value
    {
        let name_nice:String = capitalize(name);
        print!("{}? ", name_nice); // @KEEP
        stdout().flush().expect("Could not flush output for asking input from user");

        let mut res = String::new();
        stdin().read_line(&mut res).expect("Could not read user input");
        trim_newline(&mut res);
        valid_value = valid_values.contains(&res);
        if !require_valid_values { valid_value = true; }

        if !valid_value { println!("No {} with that name!", name); continue; } // @KEEP
        return res;
    }

    return String::from("");
}

fn build_valid_keywords(config: &Config, path: &PathBuf) -> Keywords
{
    let mut keywords = HashMap::new();
    for v in &config.hierarchy_names
    {
        keywords.insert(v.to_owned(), Vec::new());
    }

    read_directory(config, path, &mut keywords, 0);

    // remove duplicates
    for (_key, value) in keywords.iter_mut()
    {
        value.sort_unstable();
        value.dedup();
    }

    return keywords;
}

fn convert_query_to_path(config: &Config, file_query: &FileQuery) -> PathBuf
{
    let mut path_buf = get_root();
    for v in &config.hierarchy_names
    {
        path_buf.push(file_query.get(v).unwrap().clone());
    }

    path_buf.set_extension(config.extension.clone());
    return path_buf;
}

fn create_file_at(config: &Config, file_query: &FileQuery)
{
    let mut file_path = convert_query_to_path(config, file_query);
    if file_path.exists() { println!("File already exists"); return; }
    file_path.set_extension(config.extension.clone());
    OpenOptions::new().write(true).create_new(true).open(&file_path).unwrap();
    println!("File {} created!", file_path.display());
    
}

fn write_file_at(config: &Config, file_query: &FileQuery)
{
    let file_path = convert_query_to_path(config, file_query);

    let mut file = OpenOptions::new().append(true).create(true).open(&file_path).unwrap();
    let new_text = config.input_word.clone();

    // @ NOTE: stupid expensive check to make sure we add the word on a newline
    // (I can't "expect" this to always be the case)
    // (alternative: adding a newline at the start ALWAYS, although that will acccumulate space over time)
    let mut final_text:String = new_text.clone();
    if !fs::read_to_string(&file_path).expect("Couldn't read file contents").ends_with("\n")
    {
        final_text = "\n".to_owned() + &final_text;
    }

    if let Err(e) = writeln!(file, "{}", final_text) {
        eprintln!("Couldn't write to file: {}", e);
        return;
    }

    println!("Succesfully written to file!");
}

fn read_file_at(config: &Config, file_query: &FileQuery) -> String
{
    let file_path = convert_query_to_path(config, file_query);
    let contents = fs::read_to_string(file_path).expect("Couldn't read file contents");
    return contents;
}

fn get_root() -> PathBuf
{
    let mut path = env::current_dir().expect("No current directory?");
    path.pop();
    path.push("words");
    return path;
}

fn ignore_path(config: &Config, path: &PathBuf) -> bool
{
    let file_name_string = path.file_name().unwrap().to_str().unwrap();
    if file_name_string == "pqwordshelper" { return true; }
    if file_name_string.starts_with("_") { return true; }

    let ext = path.extension();
    if ext.is_some() {
        if ext.unwrap().to_str().unwrap() != config.extension { 
            return true;
        }
    }

    return false;
}

fn get_all_files_from(config: &Config, path: &PathBuf) -> Vec<PathBuf>
{
    let mut arr:Vec<PathBuf> = Vec::new();

    let content = fs::read_dir(path).expect("Could not read path {path}");
    for dir in content
    {
        let inner_path:PathBuf = dir.expect("Could not read subdir").path();
        let metadata = fs::metadata(&inner_path).expect("Could not get metadata");
        if ignore_path(config, &inner_path) { continue; }

        if metadata.is_dir() { 
            let res: Vec<PathBuf> = get_all_files_from(config, &inner_path);
            for v in res
            {
                arr.push(v);
            }
        } else if metadata.is_file() {
            arr.push(inner_path);
        }
    }

    return arr;
}

fn clean_file(path: &PathBuf)
{
    let text = fs::read_to_string(path).expect("Couldn't read file contents");
    let mut text_split: Vec<&str> = text.split("\n").collect();
    text_split.sort_unstable(); // sorts alphabetically

    // removes all empty / whitespace strings
    let mut indices_to_remove = Vec::new();
    for (idx,val) in text_split.iter().enumerate()
    {
        let val_no_space:String = val.chars().filter(|c| !c.is_whitespace()).collect();
        if val_no_space.len() > 0 { continue; }
        indices_to_remove.push(idx);
    }

    indices_to_remove.reverse();
    for i in 0..indices_to_remove.len()
    {
        text_split.remove(indices_to_remove[i]);
    }

    // concatenates + prints (also with a \n at the end!)
    let new_text = text_split.join("\n");
    let mut file = OpenOptions::new().write(true).truncate(true).open(&path).unwrap();
    if let Err(e) = writeln!(file, "{}", new_text) 
    {
        eprintln!("Couldn't write to file: {}", e);
    }
}

fn remove_duplicates_from_file(path: &PathBuf)
{
    let text = fs::read_to_string(path).expect("Couldn't read file contents");
    let mut text_split: Vec<&str> = text.split("\n").collect();
    text_split.sort_unstable();
    text_split.dedup();

    let new_text = text_split.join("\n");
    let nothing_changed = new_text.len() == text.len();
    let something_went_wrong = new_text.len() > text.len();
    if nothing_changed || something_went_wrong { return; }

    println!("Removed duplicates from {}", path.display());

    let mut file = OpenOptions::new().write(true).truncate(true).open(&path).unwrap();
    if let Err(e) = writeln!(file, "{}", new_text) 
    {
        eprintln!("Couldn't write to file: {}", e);
    }
}

fn get_relevant_root_paths(config: &Config) -> Vec<PathBuf>
{
    let content = fs::read_dir(get_root()).expect("Could not read root path");
    let mut arr = Vec::new();
    for dir in content
    {
        let inner_path:PathBuf = dir.expect("Could not read subdir").path();
        if ignore_path(config, &inner_path) { continue; }
        arr.push(inner_path);
    }

    return arr;
}

fn get_word_count(paths: &Vec<PathBuf>) -> usize
{
    let mut sum = 0;
    for v in paths
    {
        let text = fs::read_to_string(&v).expect("Couldn't read file contents for word counter");
        for _ in text.lines()
        {
            sum += 1
        }
    }
    return sum;
}

fn generate_config(args: Vec<String>) -> Config
{
    
    let mut config = Config {
        extension: String::from("txt"),
        backup_dir: String::from("../_backup"),
        base_command: String::from("readfile"),
        command: String::from(""),
        keywords_fixed: HashMap::new(),
        input_word: String::from(""),
        ask_input: true,
        keywords: HashMap::new(),
        hierarchy_names: vec![
            "type".to_owned(), 
            "level".to_owned(), 
            "category".to_owned(), 
            //"subcategory".to_owned()
        ]
    };

    // identify specifics (command, word inserted, etc)
    let mut command = config.base_command.clone();
    let mut input_word = String::from("");
    let mut keywords_fixed = HashMap::new();
    for (idx, value) in args.iter().enumerate()
    {
        if idx < (args.len() - 1)
        {
            let next_val = args[idx + 1].clone();

            if value == "-c" { command = next_val; }
            else if value == "-w" { input_word = next_val; }
            else if value == "-type" { keywords_fixed.insert("type".to_owned(), next_val); }
            else if value == "-level" { keywords_fixed.insert("level".to_owned(), next_val); }
            else if value == "-category" { keywords_fixed.insert("category".to_owned(), next_val); }
        }
    }

    config.keywords_fixed = keywords_fixed;
    config.command = command;
    config.input_word = input_word;

    return config;
}

fn handle_inputless_commands(config: &mut Config, files: &Vec<PathBuf>)
{
    let mut did_something = false;

    if config.command == "printvaluelist" || config.command == "printvaluestring"
    {
        did_something = true;

        let last_cat = config.hierarchy_names.last().unwrap().clone();
        let cats = config.keywords.get(&last_cat).unwrap();

        if config.command == "printvaluelist" {
            println!("{:?}", cats);
        } else {
            println!("{}", cats.join(","));
        }
    }
    
    if config.command == "removeduplicates"
    {
        did_something = true;
        for v in files.iter()
        {
            remove_duplicates_from_file(&v);
        }
    }

    if config.command == "cleanfiles"
    {
        did_something = true;
        for v in files.iter()
        {
            clean_file(&v);
        }
    }

    if did_something { config.ask_input = false; }
}

fn create_backup(config: &Config)
{
    let valid_paths = get_relevant_root_paths(&config);

    let backup_options = CopyOptions::new(); 
    let mut backup_dir = get_root();
    backup_dir.push(config.backup_dir.clone());
    if backup_dir.exists() { 
        fs::remove_dir_all(&backup_dir).expect("Could not remove existing backup dir"); 
    }
    
    fs::create_dir_all(&backup_dir).expect("Could not create new backup dir");
    println!("Made backup to {:?}", &backup_dir.display());
    copy_items(&valid_paths, &backup_dir, &backup_options).expect("Could not copy files to backup dir");
}

fn handle_inputful_commands(config: &mut Config)
{
    let mut continue_input = config.ask_input;
    while continue_input
    {
        // ask for the different levels
        let mut metadata:FileQuery = HashMap::new();
        let mut require_valid_values = true;
        if config.command == "createfile" { require_valid_values = false; }

        for v in &config.hierarchy_names
        {
            let key = v.clone();
            let res;

            if config.keywords_fixed.contains_key(v)
            {
                res = config.keywords_fixed.get(v).unwrap().clone();
            } else {
                res = ask_for(&key, config.keywords.get(&key).unwrap(), require_valid_values);
            }

            metadata.insert(key, res);
        }

        if config.command == "addword"
        {
            let empty_arr: Vec<String> = vec![];
            let res = ask_for(&"word".to_owned(), &empty_arr, false);
            config.input_word = res.clone();
            metadata.insert("name".to_owned(), res);
        }

        println!("Executing your input: {:?}", metadata);

        // now that we have that, we can perform our operation
        if config.command == "readfile"
        {
            println!("");
            println!("{}", read_file_at(&config, &metadata));
            println!("");
        }
        else if config.command == "addword"
        {
            write_file_at(&config, &metadata);
        }
        else if config.command == "createfile"
        {
            create_file_at(&config, &metadata);
        }

        print!("Do you want to continue [y/n]? ");
        stdout().flush().expect("Could not ask if user wants to continue.");

        let mut res = String::new();
        stdin().read_line(&mut res).expect("Could not read user input about continuing the process.");
        trim_newline(&mut res);

        if res == "n" { continue_input = false; }
    }

}

pub struct Config {
    extension: String,
    backup_dir: String,
    base_command: String,
    hierarchy_names:Vec<String>,
    command: String,
    input_word: String,
    ask_input: bool,
    keywords: HashMap<String, Vec<String>>,
    keywords_fixed: HashMap<String, String>
}

// @TODO: some duplicate code here and there for reading files/getting (recursive) directories
// @TODO: "statistics" => gives statistics per category, level, largest/smallest file, average word length in the file, etcetera
// @TODO: allow multiple backups? (So you can mess up a few things in a row and STILL have a valid backup?)

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut config = generate_config(args);

    create_backup(&config);

    let files = get_all_files_from(&config, &get_root());
    println!("Total # words (start): {:?}", get_word_count(&files));

    // grab valid values for type, difficulty, etc from current directory
    config.keywords = build_valid_keywords(&config, &get_root());
    //println!("Found these relevant files and folders: {:?}", keywords);

    // these commands don't need further input, so just execute now
    handle_inputless_commands(&mut config, &files);
    handle_inputful_commands(&mut config);

    let files_end = get_all_files_from(&config, &get_root());
    println!("Total # words (end): {:?}", get_word_count(&files_end));

}
