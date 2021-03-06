let UP = +1;
let DOWN = -1;

chrome.extension.getBackgroundPage().console.log('action = ' + page_action);

if (page_action == UP) {
    document.getElementsByClassName("btnSuccess")[0].click();
}

if (page_action == DOWN) {
    document.getElementsByClassName("btnDown")[0].click();
}