
// open chat
function open_chat()
{
    if(localStorage.getItem('current_room')==null){return;}

    // local storage stores data in string 
    const room_string = localStorage.getItem('current_room');
    const current_room = JSON.parse(room_string);

    // make required stuff visible!
    document.getElementById("leaveButton").style.display ="flex";
    document.getElementById("chat_input_area").style.display ="flex";

    // adding title
    const title = document.getElementById("room_title");
    title.innerText = current_room.name;
    

    console.log(`Entered room ${current_room.name}`);

    
}
open_chat();


function leave_chat()
{
    // localStorage.setItem('current_room', null);
    document.getElementById("chat_input_area").style.display ="none";
    document.getElementById("leaveButton").style.display ="none";
    document.getElementById("room_title").innerText ="";
    localStorage.setItem('current_room', null);
}


function logout(){
    localStorage.setItem('stored_user', null);
    leave_chat();
    window.location.href = "../login_screen/login.html";
}



//open theme room 
function opentheme(themeName){
    document.getElementById("chat_input_area").classList.add("active");
    window.location.href = "../buffer_screen/buffer.html";
}





//sending chats
async function send_chat() {

    const chatArea = document.querySelector(".container_right");

    const typed = document.querySelector(".typing_box");

    const msgText = typed.value.trim()

    if(msgText=="")return;

    const message = document.createElement("div");
    message.classList.add("message","sent");
    message.innerText = msgText;
    console.log(message.innerHTML);

    typed.value="";
    typed.focus();


    chatArea.appendChild(message);
    /* Scroll chat area to the newest message */
    chatArea.scrollTop = chatArea.scrollHeight;

    
}



// we want to click send button whenever enter is pressed!
const typingBox = document.querySelector(".typing_box");
typingBox.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        send_chat();
    }
});


//browse chatrooms button
function browse_chatroom_page(){
    window.location.href = "../browse_screen/browse.html";
}

//create chatroom button
function create_chatroom_page(){
    window.location.href = "../create_room_screen/create_room.html";
}


