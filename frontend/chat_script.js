


// themes
themes = ["Random", "college", "chill", "a", "b", "c"];
async function add_themes(){
    themeArea = document.querySelector(".container_left");
    
    for (const t of themes){
        const theme = document.createElement("button");
        // dont forget const while defining stuff

        theme.addEventListener("click", function(){opentheme(t);});
        theme.innerText = t;
        theme.classList.add("theme_button");
        themeArea.appendChild(theme);
    }
}
add_themes();


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



