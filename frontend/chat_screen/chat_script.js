// const { json } = require("body-parser");

const API_URL = 'http://localhost:3000';

// for loading chats via polling
let polling_Interval = null;
let last_chat_id =0;

function startPolling(chatroom_id){

    if(polling_Interval !== null)
        return;

    polling_Interval = setInterval(async function(){

        last_chat_id = await load_chats(chatroom_id, last_chat_id);

    },1000);

}

function stopPolling(){

    if(polling_Interval !== null){

        clearInterval(polling_Interval);

        polling_Interval = null;

    }

}




//browse chatrooms button
async function browse_chatroom_page(){

    // stop polling this chat
    stopPolling();
    leave_chat();

    window.location.href = "../browse_screen/browse.html";
}

//create chatroom button
async function create_chatroom_page(){
    // stop polling the chat
    stopPolling();
    leave_chat();

    window.location.href = "../create_room_screen/create_room.html";
}


// open chat
function open_chat()
{
    // local storage stores data in string 
    const room_string = localStorage.getItem('current_room');
    if(!room_string || room_string ==='null'){return;}
    console.log("room_string =", room_string);
    console.log("typeof =", typeof room_string);

    const current_room = JSON.parse(room_string);
    console.log("current_room =", current_room);

    // make required stuff visible!
    document.getElementById("leaveButton").style.display ="flex";
    document.getElementById("chat_input_area").style.display ="flex";
    document.querySelector(".container_right").classList.add("chat_open");

    // adding title
    const title = document.getElementById("room_title");
    title.innerText = current_room.name;
    

    console.log(`Entered room ${current_room.name}`);


    // add a member to Chatrooms table and well as this chatroom's table
    add_member(current_room.chatroom_id);


    // load all chats
    startPolling(current_room.chatroom_id);

    
}
open_chat();


async function leave_chat()
{
    // empty the chat area
    document.getElementById("chat_input_area").style.display ="none";
    // remove leave button
    document.getElementById("leaveButton").style.display ="none";
    // remove room title
    document.getElementById("room_title").innerText ="";
    document.querySelector(".container_right").classList.remove("chat_open");


    // stop polling the chat
    stopPolling();


    // remove a member from chatroom members
        const room_string = localStorage.getItem('current_room');
        if(room_string === null){return;}
        const current_room = JSON.parse(room_string);

        // DONT forget to do await!!! Or execution will simply move ahead!!
        await remove_member(current_room.chatroom_id);
        localStorage.removeItem("current_room");
}


function logout(){
    // stop polling the chat
    stopPolling();

    localStorage.setItem('stored_user', null);
    leave_chat();
    window.location.href = "../login_screen/login.html";
}


async function add_member(chatroom_id)
{
    add_member_URL = API_URL+"/add_member";
    const user = localStorage.getItem('storedUser');

    try{
        const response = await fetch(add_member_URL,{
            method:'POST',
            headers:{'Content-Type':'Application/json'},
            body:JSON.stringify({
                user:user,
                chatroom_id:chatroom_id
            })
        });

        // response also we get as a string
        const result = await response.json();

        if(result.okay)
        {
            console.log("Member successfully added to Room and Chatrooms table updated");
        }
        else
        {
            console.log(result.message);
            alert(result.message);
        }
    }
    catch(err)
    {
        console.log('Server Error');
        alert('Server Error');
    }
}

async function remove_member(chatroom_id)
{
    remove_member_URL = API_URL+"/remove_member";
    const user = localStorage.getItem('storedUser');

    try{
        const response = await fetch(remove_member_URL,{
            method:'POST',
            headers:{'Content-Type':'Application/json'},
            body:JSON.stringify({
                user:user,
                chatroom_id:chatroom_id
            })
        });

        // response also we get as a string
        const result = await response.json();

        if(result.okay)
        {
            console.log("Member successfully removed from Room and Chatrooms table updated");
        }
        else
        {
            console.log(result.message);
            alert(result.message);
        }
    }
    catch(err)
    {
        console.log('Server Error');
        alert('Server Error');
    }
}

// loading all chats
const load_chats_URL = API_URL + "/load_chats";
async function load_chats(chatroom_id, last_chat_id){

        try{
            console.log("Loading chats....");
            //load all chats wrt the given room

            const response = await fetch(load_chats_URL,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    chatroom_id:chatroom_id,
                    last_chat_id:last_chat_id
                })

            });

            const result = await response.json();

            if(result.okay)
            {
                const new_chats = result.new_chats;
                const chatArea = document.querySelector(".container_right");
                const user = localStorage.getItem('storedUser');


                

                for(const chat of new_chats)
                {
                    last_chat_id = chat.chat_id;

                    // creating a message element
                    const message = document.createElement("div");
                    message.classList.add('message');

                    // creating a sender element,child of message
                    const sender = document.createElement("div");
                    sender.classList.add("sender");

                    // creating a text element, child of message
                    const text = document.createElement("div");
                    text.classList.add("text");
                    
                    // adding classlist based on who is sender of message
                    if(chat.sender === user)
                    {
                        message.classList.add('sent');
                        sender.innerText = "You";
                    }
                    else
                    {
                        message.classList.add('received');
                        sender.innerText = chat.sender;
                    }
                    

                    // checking if message is deleted
                    if(chat.deleted)
                    {
                        message.classList.add('deleted');
                        text.innerText = "..deleted";
                    }
                    else
                    {
                        text.innerText = chat.message
                    }

                    // checking if message is edited
                    if(chat.edited)
                    {
                        message.classList.add('edited');
                    }


                    // creating an options button used to delete, edit or reply
                    const options = document.createElement("button");
                    options.innerText = "⋮"; 
                    options.addEventListener("click", async function(event)
                        {
                            event.stopPropagation();
                            const menu = document.createElement("div");
                            menu.classList.add("chat_menu");

                            menu.innerHTML = `
                            <button class="delete_chat" onclick="delete_chat(${chat.chat_id})">Delete</button>
                            <button class="edit_chat" onclick="edit_chat(${chat.chat_id})">Edit</button>
                            <button class="replying" onclick="reply_chat(${chat.chat_id})">Reply</button>
                            `
                            // add it to message bar itself!!
                            message.appendChild(menu);
                        });
                    message.appendChild(options);
                    message.appendChild(sender);
                    message.appendChild(text);
                    chatArea.appendChild(message);

                }


                return last_chat_id;
            }
            else
            {
                console.log("Unable to fetch chats from backend");
                return 0;
            }
            
        }
        catch(err)
        {
            console.error(err);
        }
    
    
}


const upload_chats_URL = API_URL + "/upload_chat";
async function send_chat()
{
    // first select a room!
    const current_room_string = localStorage.getItem('current_room');
    // This is always string!!!
    const current_room = JSON.parse(current_room_string);
    const room_id = current_room.chatroom_id;

    // finding the message itself
    const msgBox = document.querySelector(".typing_box");
    const chatArea = document.getElementById("chats");
    const typed = msgBox.value.trim();
    if(typed=="")return;

    // finding the message sender's name
    const sender = localStorage.getItem('storedUser');

    // doing the fetch request
    try{
        const response = await fetch(upload_chats_URL, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                room_id:room_id,
                sender:sender,
                notif:"none",
                replying: false,
                replying_to:"none",
                deleted:false,
                message:typed
            })
        });

        const result = await response.json();

        if(result.okay)
        {
            console.log(`Message :${typed} sent to database successfully`);
            chatArea.scrollTop = chatArea.scrollHeight;
            msgBox.value ="";
            msgBox.focus();
        }
        else
        {
            console.log(`Unable to send message to db`);
        }

    }
    catch(err)
    {
        console.log(err);
    }

}


// we want to click send button whenever enter is pressed!
const typingBox = document.querySelector(".typing_box");
typingBox.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        // Don't perform your normal built-in behavior. I'll handle it myself
        send_chat();
    }
});





