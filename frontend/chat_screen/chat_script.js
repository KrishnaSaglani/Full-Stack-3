// const { json } = require("body-parser");


// Socket.io connection:
const socket = io("http://localhost:3000");
socket.on("connect", function(){

    console.log("Connected!");
    console.log(socket.id);

    const user = localStorage.getItem("storedUser");
    console.log(`${user} connected!`)

});
socket.on("disconnect", function(){

    console.log("Disconnected.");

});

// const API_URL = 'http://localhost:3000';

// for loading chats via polling
let polling_Interval = null;
let last_chat_id =0;
let scrolled_up = 0;
let menu_open = 0;
let reply_edit_header_open = false;
let replying = false;
let reply_edit_chat_id = 0;
let first_open = false;






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




// Lets replace polling now!
socket.on("new_message", async function(data){
    console.log("[RECEIVED]", data);
    last_chat_id = await load_chats(data.room_id, last_chat_id);
    console.log(`Loaded chats for room ${data.room_id}` );

    // scroll up whenever new message is received!
    const chatArea = document.getElementById("chats");
    chatArea.scrollTop = chatArea.scrollHeight;
 
});

socket.on("edited_message", async function(data){
    console.log("[RECEIVED]", data);
    await load_edited_chat(data.room_id, data.chat_id)
    console.log(`Edited chat id ${data.chat_id}` );
});

socket.on("deleted_message", async function(data){
    console.log("[RECEIVED]", data);
    await load_edited_chat(data.room_id, data.chat_id);
    console.log(`Deleted chat id ${data.chat_id}` );
});







//browse chatrooms button
async function browse_chatroom_page(){

    // stop polling this chat
    // stopPolling();
    await leave_chat();

    window.location.href = "../browse_screen/browse.html";
}

//create chatroom button
async function create_chatroom_page(){
    // stop polling the chat
    // stopPolling();
    await leave_chat();

    window.location.href = "../create_room_screen/create_room.html";
}





const load_chats_URL = "/load_chats";

// open chat
async function open_chat()
{
    // local storage stores data in string 
    const room_string = localStorage.getItem('current_room');
    if(!room_string || room_string ==='null'){return;}
    console.log("room_string =", room_string);
    console.log("typeof =", typeof room_string);

    const current_room = JSON.parse(room_string);
    console.log("current_room =", current_room);

    // make required stuff visible! Like Leave button and send button, typing box!
    document.getElementById("leaveButton").style.display ="flex";
    document.getElementById("chat_input_area").style.display ="flex";

    // start with removing the header initially!
    document.querySelector(".reply_edit_header").style.display ="none";

    // chat_input_area.classList.add("active");
    document.querySelector(".container_right").classList.add("chat_open");

    // adding title
    const title = document.getElementById("room_title");
    title.innerText = current_room.name;
    

    console.log(`Entered room ${current_room.name}`);


    

    // focus on msg box too!
    const msgBox = document.querySelector(".typing_box");
    msgBox.focus();


    // add a member to Chatrooms table and well as this chatroom's table
    add_member(current_room.chatroom_id);

    // also add to socket.io room!
    socket.emit("join_room",{
        chatroom_id:current_room.chatroom_id,
        username: localStorage.getItem("storedUser")
    })


    // load all chats only the first time!
    last_chat_id =0;
    last_chat_id = await load_chats(current_room.chatroom_id, last_chat_id);
    // startPolling(current_room.chatroom_id);


    // scroll up whenever room opened
    const chatArea = document.getElementById("chats");
    chatArea.scrollTop = chatArea.scrollHeight;
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

    // clearing the chat area
    const chatArea = document.querySelector(".container_right");
    chatArea.classList.remove("chat_open");
    // remove all old stuff
    const elements = chatArea.querySelectorAll(".message, .chat_menu");
    for(const element of elements)
    {
        element.remove();
    }


    // stop polling the chat
    // stopPolling();


    // remove a member from chatroom members
        const room_string = localStorage.getItem('current_room');
        if(room_string === null){return;}
        const current_room = JSON.parse(room_string);

        // DONT forget to do await!!! Or execution will simply move ahead!!
        await remove_member(current_room.chatroom_id);

        // leave the socketroom you just joined
        await socket.emit("leave_room", {
            chatroom_id: current_room.chatroom_id,
            username: localStorage.getItem("storedUser")
        });

        // remove from local storage
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
    add_member_URL = "/add_member";
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
    remove_member_URL = "/remove_member";
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







const delete_chat_URL = "/delete_chat";
async function delete_chat(chat_id, room_id)
{
    try{
        const response = await fetch(delete_chat_URL,{
            method:'POST',
            headers:{'Content-Type':'Application/json'},
            body: JSON.stringify({
                room_id:room_id,
                chat_id:chat_id
            })
        });

        const result = await response.json();

        if(result.okay)
        {

            // focus on typing now!
            const msgBox = document.querySelector(".typing_box");
            msgBox.focus();

            // rest occurs in sendChat() !!

        }
        else{
            console.log("Contacted backend but unable to delete from db");
            console.log(result.message);
        }

    }
    catch(err)
    {
        console.log(err);
        console.log("Server Error");
    }
}

async function edit_chat(chat_id, room_id, message)
{
    // first get the edited text from the user's typing box.
    // creating a reply_edit heador for user to know whats up
    const reply_edit_header = document.querySelector(".reply_edit_header");

    // dont forget to make this false later
    reply_edit_header_open= true;

    const reply_edit_info = document.createElement("div");
    reply_edit_info.classList.add("reply_edit_info");

    const reply_edit_title = document.createElement("div");
    reply_edit_title.classList.add("reply_edit_title");
    reply_edit_title.innerText ="Editing..";

    const reply_edit_preview = document.createElement("div");
    reply_edit_preview.classList.add("reply_edit_preview");
    reply_edit_preview.innerText =message;

    const reply_edit_close = document.createElement("button");
    reply_edit_close.classList.add("reply_edit_close");
    reply_edit_close.innerText ="✕";
    reply_edit_close.addEventListener("click", function(event){
        event.stopPropagation();
        reply_edit_header.style.display ="none";
        reply_edit_header_open = false;
    });

    // now appending everything
    // first remove things already in here
    reply_edit_header.innerHTML = "";

    reply_edit_info.appendChild(reply_edit_title);
    reply_edit_info.appendChild(reply_edit_preview);
    reply_edit_header.appendChild(reply_edit_info);
    reply_edit_header.appendChild(reply_edit_close);

    // display header
    reply_edit_header.style.display = "flex";
    chat_input_area.classList.add("active");

    console.log(`Editing message: ${message}`);

    // finally saving the reply_edit_chat_id
    reply_edit_chat_id = chat_id;

    // focus on typing now!
    const msgBox = document.querySelector(".typing_box");
    msgBox.focus();

    // rest is handled in send_chat() itself
}

async function reply_chat(chat_id, room_id, message, sender)
{
    // first get the edited text from the user's typing box.
    // creating a reply_edit heador for user to know whats up
    const reply_edit_header = document.querySelector(".reply_edit_header");


    replying = true;

    // dont forget to make this false later
    reply_edit_header_open= true;

    const reply_edit_info = document.createElement("div");
    reply_edit_info.classList.add("reply_edit_info");

    const reply_edit_title = document.createElement("div");
    reply_edit_title.classList.add("reply_edit_title");
    reply_edit_title.innerText ="Replying..";

    const reply_edit_preview = document.createElement("div");
    reply_edit_preview.classList.add("reply_edit_preview");
    reply_edit_preview.innerText ="("+sender+") "  + message;

    const reply_edit_close = document.createElement("button");
    reply_edit_close.classList.add("reply_edit_close");
    reply_edit_close.innerText ="✕";
    reply_edit_close.addEventListener("click", function(event){
        event.stopPropagation();
        reply_edit_header.style.display ="none";
        reply_edit_header_open = false;
    });

    // now appending everything
    // first remove things already in here
    reply_edit_header.innerHTML = "";

    reply_edit_info.appendChild(reply_edit_title);
    reply_edit_info.appendChild(reply_edit_preview);
    reply_edit_header.appendChild(reply_edit_info);
    reply_edit_header.appendChild(reply_edit_close);

    // display header
    reply_edit_header.style.display = "flex";
    chat_input_area.classList.add("active");

    console.log(`Replying to message: ${message}`);

    // finally saving the reply_edit_chat_id
    reply_edit_chat_id = chat_id;


    // focus on typing now!
    const msgBox = document.querySelector(".typing_box");
    msgBox.focus();

    // rest is handled in send_chat() itself
}









const load_edited_chat_URL = "/load_edited_chat";
async function load_edited_chat(chatroom_id,edited_id)
{
        if(edited_id != 0)
        {
            console.log(`Loading single chat having id: ${edited_id}....`);
            //load all chats wrt the given room
            try{

                        const response = await fetch(load_edited_chat_URL,{
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({
                            chatroom_id:chatroom_id,
                            edited_id:edited_id
                        })
                    });

                    const result = await response.json();


                    if(result.okay)
                    {
                        const edited_chat = result.new_chats[0];

                        
                        //find in already existing messages
                        const messages= document.querySelectorAll(".message");

                            for(const msg of messages)
                            {
                                const id = msg.querySelector(".id");
                                if(Number(id.innerText) === edited_id)
                                {
                                    // first check if its deleted!!
                                    
                                    if(edited_chat.deleted)
                                    {
                                        msg.classList.add("deleted");
                                        const text = msg.querySelector(".text");
                                        text.innerText="This message was deleted.";

                                        // remove options button
                                        const options = msg.querySelector(".options_button");
                                        options.remove();
                                        
                                        return;
                                    }


                                    // loading this single message in different way
                                    msg.classList.add("edited");

                                    // finally loading the edited text
                                    if(!edited_chat.deleted)
                                    {
                                        const text = msg.querySelector(".text");
                                        text.innerText = edited_chat.message;
                                    }

                                    // edited chat successfully loaded
                                    break;

                                }


                            }

                    }
                    
                    return;

            }
            catch(err)
            {
                console.error(err);
            }
            
        }
}


// loading all chats

async function load_chats(chatroom_id, last_chat_id){
        // load regular chats
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

                    // adding id to the message also, so it can be edited or deleted later
                    const id = document.createElement('div');
                    id.classList.add('id');
                    id.innerText = chat.chat_id;
                    id.style.display = "none";

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
                        text.innerText = "This message was deleted.";
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


                    // checking if message is replying to someone
                    const replying_to = document.createElement("div");
                    if(chat.replying)
                    {
                        replying_to.classList.add("replying_to");
                        replying_to.innerText = chat.replying_to;
                        message.classList.add("replying");

                    }


                    // creating an options button used to delete, edit or reply
                    const options = document.createElement("button");
                    options.classList.add("options_button");
                    options.innerText = "⋮"; 

                
                    options.addEventListener("click", async function(event)
                        {
                            event.stopPropagation();
                            const menu = document.createElement("div");
                            menu.classList.add("chat_menu");

                            if(chat.sender === user)
                            {
                                //only user can delete/ edit his OWN stuff!
                                    menu.innerHTML = `
                                        <button class="delete_chat" onclick="delete_chat(${chat.chat_id},${chatroom_id})">Delete</button>
                                        <button class="edit_chat" onclick="edit_chat(${chat.chat_id}, ${chatroom_id}, '${chat.message}')">Edit</button>
                                        <button class="replying" onclick="reply_chat(${chat.chat_id}, ${chatroom_id}, '${chat.message}', '${chat.sender}')">Reply</button>
                                        `
                                
                            }
                            else
                            {

                                menu.innerHTML = `
                                    <button class="replying" onclick="reply_chat(${chat.chat_id}, ${chatroom_id}, '${chat.message}', '${chat.sender}')">Reply</button>
                                    `
                              
                            }



                            
                            
                            const menus = document.querySelectorAll(".chat_menu");
                            for(const menu of menus)
                            {
                                menu.remove();
                            }
                            
                            message.appendChild(menu);



                        });

                    if(!chat.deleted){message.appendChild(options);}
                    if(chat.replying){message.appendChild(replying_to);}
                    message.appendChild(sender);
                    message.appendChild(text);
                    message.appendChild(id);
                    chatArea.appendChild(message);
                    
                }

                // lets scroll up!
                if(scrolled_up===0)
                {
                    chatArea.scrollTop = chatArea.scrollHeight;
                    scrolled_up=1;
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










const upload_chats_URL = "/upload_chat";
const edit_chat_URL = "/edit_chat";
async function send_chat()
{
    scrolled_up = 0;
    // first select a room!
    const current_room_string = localStorage.getItem('current_room');
    // This is always string!!!
    const current_room = JSON.parse(current_room_string);
    const room_id = current_room.chatroom_id;

    // finding the message itself
    const msgBox = document.querySelector(".typing_box");
    const chatArea = document.getElementById("chats");
    
    const typed = msgBox.value.trim();

    // finding the message sender's name
    const sender = localStorage.getItem('storedUser');
    

    // edit mode
    if(reply_edit_header_open && !replying)
    {
        const reply_edit_header = document.querySelector(".reply_edit_header");
        
        // if nothing typed, close edit mode
        if(typed=="")
        {
            reply_edit_header.style.display ="none";
            reply_edit_header_open = false;
            return;
        }

        // Also check if you are the sender or not!

        const chat_id = reply_edit_chat_id;
        const messages = document.querySelectorAll(".message");
        // for( const msg of messages)
        // {
        //     const id = msg.querySelector(".id");
        //     if(Number(id.innerText) === chat_id)
        //     {
        //         const senderName = msg.querySelector(".sender").innerText;

        //         if (senderName != "You")
        //         {
        //             alert("Cannot edit other's messages");

        //             // reset everything
        //             reply_edit_header.style.display = "none";
        //             reply_edit_header_open = false;
        //             reply_edit_chat_id = 0;

        //             msgBox.value = "";
        //             msgBox.focus();
        //             return;
        //         }
        //     }
        // }
        
    // time to actualy edit the message
        
        // first edit inside the database
        try{
                const response = await fetch(edit_chat_URL, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    room_id:room_id,
                    sender:sender,
                    notif:"edited",
                    replying: false,
                    replying_to:"none",
                    deleted:false,
                    message:typed,
                    chat_id:reply_edit_chat_id
                })
            });

            const result = await response.json();

            if(result.okay)
            {
                console.log("Edited successfully");
                // then load this particular chat again
                load_edited_chat(room_id, reply_edit_chat_id );


                // now reset it all
                
                    reply_edit_header.style.display = "none";
                    reply_edit_header_open = false;
                    reply_edit_chat_id = 0;

                    msgBox.value = "";
                    msgBox.focus();


            }
            else{
                console.log("Unable to edit");
            }

        }
        catch(err)
        {
            console.error(err);
        }

        return;
    }

    // reply Mode!
    if(reply_edit_header_open && replying)
    {
        if(typed=="")return;
        const reply_edit_preview = document.querySelector(".reply_edit_preview");
        const replying_to = reply_edit_preview.innerText;
        try{
                const response = await fetch(upload_chats_URL, {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({
                        room_id:room_id,
                        sender:sender,
                        notif:"replying",
                        replying: true,
                        replying_to:replying_to,
                        deleted:false,
                        message:typed
                    })
                });

                const result = await response.json();

                if(result.okay)
                {
                    // reset these settings!
                    const reply_edit_header = document.querySelector(".reply_edit_header");
                    reply_edit_header.style.display = "none";
                    reply_edit_header_open = false;
                    reply_edit_chat_id = 0;


                    console.log(`Reply :${typed} sent to database successfully`);
                    chatArea.scrollTop = chatArea.scrollHeight;
                    msgBox.value ="";
                    msgBox.focus();
                    replying = false;
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

            return;
    }



    
    
    if(typed=="")return;

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




    const trending_rooms_URL = "/trending_rooms";
    async function Trending_Rooms()
    {
        const roomsArea = document.querySelector(".container_left");
        // Always clear before appending new stuff
        roomsArea.innerHTML="";


        const trend_title = document.createElement("div");
        trend_title.classList.add("trend_title");
        trend_title.innerText = "Top 10 Rooms..."
        roomsArea.appendChild(trend_title);

        const sender = localStorage.getItem('storedUser');

        

        try{
            const response = await fetch(trending_rooms_URL,{
                method:'GET'
            });

            const result = await response.json();


            if(result.okay)
            {
                // set last_chat_id at 0
                
                console.log(`Trending rooms accessed successfully`);
                const trending = result.trending;


                for(const room of trending)
                {
                    const new_room = document.createElement("button");
                    new_room.classList.add("room_card");

                    const title = document.createElement("div");
                    title.classList.add("title");
                    title.innerText = room.name;

                    const members= document.createElement("div");
                    members.classList.add("members");
                    members.innerText = room.current_members + "/" + room.max_members;

                    // check the sender
                    if(room.creator === sender)
                    {
                        new_room.classList.add("my_trending");
                    }
                    // Extra details
                    const details = document.createElement("div");
                    const details_button = document.createElement("button");
                    details_button.innerText = "Details";

                    details.classList.add("details");
                    const created = new Date(room.date_created);
                        const expiry = new Date(created);
                        expiry.setDate(expiry.getDate() + room.active_for);

                        const now = new Date();
                        // current date

                        const diff = expiry - now;

                        const days = Math.floor(diff/(1000*60*60*24));
                        const hours = Math.floor(
                            (diff % (1000 * 60 * 60 * 24)) /
                            (1000 * 60 * 60)
                        );


                        let expanded = false;
                    details_button.addEventListener("click", async function(event){
                        event.stopPropagation();

                        if(!expanded)
                        {
                            details.innerHTML=`
                            Description: ${room.description} <br>
                            Rule: ${room.rule}<br>
                            Active for: ${days}d, ${hours}h
                            `;
                            expanded =true;
                        }
                        else
                        {
                            details.innerText = "";
                            expanded = false;
                        }

                        
                    })

                    details.appendChild(details_button);

                    new_room.appendChild(title);
                    new_room.appendChild(members);
                    new_room.appendChild(details);

                    new_room.addEventListener("click",async function(event){
                        event.stopPropagation();
                        

                        // first leave old chat then enter new chat!!
                        await leave_chat();
                        localStorage.setItem("current_room", JSON.stringify(room));
                        last_chat_id =0;
                        await open_chat();

                        
                    });


                    roomsArea.appendChild(new_room);

                }

            }
            
            
        }
        catch(err)
        {
            console.log(err);
        }

    }
    Trending_Rooms();



    


// we want to click send button whenever enter is pressed!
const typingBox = document.querySelector(".typing_box");
typingBox.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        // Don't perform your normal built-in behavior. I'll handle it myself
        send_chat();
    }
});


// turn off all extra menus
document.addEventListener("click", function(){
    document.querySelectorAll(".chat_menu").forEach(menu => {
        menu.remove();
    });
});

