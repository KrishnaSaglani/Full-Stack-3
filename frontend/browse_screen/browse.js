

async function enter_room(room){
    console.log(`entered room ${room}`);

}




const sample_rooms = ["a","b","c","d"]
async function addChatrooms(){
    buttonArea = document.querySelector(".centre_container");

    for (const room of sample_rooms){

        // creating a button element
        const button = document.createElement("button");
        button.innerText = room;

        // giving it semantics
        button.addEventListener("click", function(){enter_room(room)});

        // giving it a class
        button.classList.add("chatroom_button");

        // adding it to the collection
        buttonArea.appendChild(button);

    }
}

addChatrooms()