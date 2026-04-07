async function saveEvent(name, date, location, playlistURL) {
    const data = {
        name: name, 
        date: date, 
        location: location, 
        playlistURL: playlistURL};

    try {
        await chrome.storage.sync.set(data)
        console.log("Event saved!")
    } catch (error) {
        console.log("Something went wrong", error)
    }    
}
async function loadEvent() {
    try {
        return await chrome.storage.sync.get(["name", "date", "location", "playlistUrl"])
    } catch (error) {
        console.log("Something went wrong", error)
    }
    
}

document.getElementById("save").addEventListener("click", () => {
    const name = document.getElementById("name").value;
    const date = document.getElementById("date").value;
    const location = document.getElementById("location").value;
    const playlist = document.getElementById("playlist").value;
    saveEvent(name, date, location, playlist);
});