

async function enter_room(room){
    console.log(`entered room ${room.name}`);

}




const sample_rooms = 
[
    {id:"a",name:"room a", description:"description a"},
    {id:"b",name:"room b", description:"description b"},
    {id:"c",name:"room c", description:"description c"},
    {id:"d",name:"room d", description:"description d"}
]

async function addChatrooms(){
    buttonArea = document.querySelector(".centre_container");

    for (const room of sample_rooms){

        // creating a button element
        const button = document.createElement("button");
        
        // creating the inside of each button:
        const id = document.createElement("h2");
        id.innerText = room.id;

        const title = document.createElement("h3");
        title.innerText= room.name;

        const description = document.createElement("p");
        description.innerText= room.description;

        //adding all to button:
        button.appendChild(id);
        button.appendChild(title);
        button.appendChild(description);


        // giving it semantics
        button.addEventListener("click", function(){enter_room(room)});

        // giving it a class
        button.classList.add("chatroom_button");

        // adding it to the collection
        buttonArea.appendChild(button);

    }
}
addChatrooms()


async function go_back() {
    window.location.href ="../chat_screen/chat.html";
}