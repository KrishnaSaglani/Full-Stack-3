

async function go_back() {
    window.location.href ="../chat_screen/chat.html";
    
}

function retry(){
    window.location.href ="create_room.html";
}

const create_room_URL = "http://localhost:3000/create_room";
async function create_room(){
    const creator = localStorage.getItem('storedUser');
    const name = document.getElementById("name").value;
    const description = document.getElementById("description").value;
    let max_members = document.getElementById("max_members").value;
    // max_members is a variable!!
    const rule = document.getElementById("rule").value;
    const activeFor = Number(document.getElementById("active_for").value);

    if (!name.trim()) {
            alert("Room name cannot be empty.");
            return;
    }
    if (!description.trim()) {
            alert("Kindly Fill Room Description.");
            return;
    }
    if (!activeFor) {
            alert("Kindly fill Activation Duration.");
            return;
    }

    if(!max_members){
        alert("Default maximum members is set at 20.");
        max_members = 20;
    }
    
    // Always disable button while you are sending fetch request to backend
    const create_button = document.querySelector(".create");
    create_button.disabled = true;

    try{
        
        const response= await fetch (create_room_URL, {
            method:'POST',
            headers:{
                'Content-Type': 'application/json' // Tells the server "I am sending JSON"
            },
            body: JSON.stringify({
                creator:creator,
                name: name,
                description: description,
                max_members: max_members,
                rule: rule,
                activeFor: activeFor
            })// Turns the JSON object into a string for the trip
        });
            if (!response.ok) {
                throw new Error("Server error");
                alert("Server Error!");
            }

        const result = await response.json();
        // converting back to json to use
        // result contains: okay, chat_id, err, failure_message

        const show_result = document.getElementById("display");
        if(result.okay)
        {   
            show_result.innerHTML=`
            <h1 class = "success">Room Created Successfully</h1>
            <button class = "proceed" onclick="enter_chat(${result.chat_id})"> Proceed </button>
            `;
        }
        else{
            show_result.innerHTML=`
                <h1 class = "failure">Unable to Create Room</h1>
                <h2 class = "failure_message">${result.failure_message}</h2>
                <button class = "retry" onclick="location.reload()"> Retry </button>
               
                `;

        }
    }
    catch(err)
    {
        console.error("Error during Login:", err);
        alert("Unable to connect to the server. Please try again.");
    }
    finally{
        create_button.disabled = false;
    }


    

}