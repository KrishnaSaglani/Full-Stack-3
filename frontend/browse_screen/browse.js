
// const API_URL = 'http://localhost:3000';


const add_chatrooms_URL = "/retrieve_chatrooms"
async function addChatrooms() {

    const buttonArea = document.querySelector(".centre_container");

    buttonArea.innerHTML = "";

    try {

        const response = await fetch(add_chatrooms_URL, {
            method: "GET"
        });

        const rooms = await response.json();

        console.log("Server response:", rooms);

        const currentUser = localStorage.getItem("storedUser");

        // Create headings only once
        const myHeading = document.createElement("h2");
        myHeading.innerText = "My Transmissions";
        myHeading.classList.add("my_heading");
        

        const publicHeading = document.createElement("h2");
        publicHeading.innerText = "Public Transmissions";
        publicHeading.classList.add("public_heading");

        let myHeadingAdded = false;
        let publicHeadingAdded = false;
        

        for (const room of rooms) {

            console.log(`stored user is ${currentUser} `);

            const button = document.createElement("button");
            button.classList.add("chatroom_button");

            //--------------------------------------------------
            // Left side
            //--------------------------------------------------

            const left = document.createElement("div");
            left.classList.add("room_left");

            const title = document.createElement("h3");
            title.innerText = room.name;

            const description = document.createElement("p");
            description.innerText = room.description;

            left.appendChild(title);
            left.appendChild(description);

            //--------------------------------------------------
            // Right side
            //--------------------------------------------------

            const right = document.createElement("div");
            right.classList.add("room_right");

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

            if(room.chatroom_rule.trim() === "")
            {
                room.chatroom_rule = "NA";
            }

            right.innerHTML = `
                ${room.current_members}/${room.max_members} members   |  ${days}d ${hours}h remaining
                <br> <br>Rule: ${room.chatroom_rule}
            `;


            button.appendChild(left);
            button.appendChild(right);

            //--------------------------------------------------

            if (room.creator === currentUser) {

                if (!myHeadingAdded) {
                    buttonArea.appendChild(myHeading);
                    myHeadingAdded = true;
                }

                button.classList.add("self_created");

                    delete_button = document.createElement("button");
                    delete_button.innerText = "Delete Room";
                    delete_button.classList.add("delete_button");
                    delete_button.addEventListener("click", async function(event)
                    {
                        event.stopPropagation();
                        // prevents the parent button to also be pressed!!

                        //lets create a confirm button

                        confirm_box = document.createElement("div");


                        try{
                            delete_URL = API_URL + "/delete_chatroom";
                            const response= await fetch (delete_URL, {
                                method:'POST',
                                headers:{
                                    'Content-Type': 'application/json' // Tells the server "I am sending JSON"
                                },
                                body: JSON.stringify({
                                    chatroom_id: room.chatroom_id
                                })// Turns the JSON object into a string for the trip
                            });
                                
                            const result = await response.json();

                            if(result.okay)
                            {      

                                alert(`Chatroom Successfully Deleted`);
                                refresh_browse();
                                location.reload();
                            }
                            else
                            {
                                alert(result.message);
                            }
                        }
                        catch(err)
                        {
                            alert(`Unable to delete chatroom. Server Error`);
                        }
                    });

                    button.appendChild(delete_button);
            }
            else {

                if (!publicHeadingAdded) {
                    buttonArea.appendChild(publicHeading);
                    publicHeadingAdded = true;
                }

                button.classList.add("public_room");

            }

            //most importantly this is how to add onlclick separately
            button.addEventListener("click", async function(event){enter_room(room)} );

            buttonArea.appendChild(button);

        }

    }
    catch (err) {

        console.log(err);
        alert("Server Error");

    }

}
addChatrooms();


const enter_URL = `/enter_chatroom`;
async function enter_room(room){
    console.log(`entered room ${room.name}`);

    localStorage.setItem('current_room', JSON.stringify(room));


    window.location.href = '../chat_screen/chat.html';
    

}


const refresh_URL = "/refresh_chatrooms";
async function refresh_browse()
{
    try{
        const response = await fetch(refresh_URL,{
            method:"GET"
        })

        const result = await response.json();
        if(result.success)
        {
            console.log('Refreshed successfully');
        }
        else{
            console.log(result.message);
        }
    }
    catch(err)
    {
        console.log('Unable to access server');
    }

};
refresh_browse();




async function go_back() {
    window.location.href ="../chat_screen/chat.html";
}