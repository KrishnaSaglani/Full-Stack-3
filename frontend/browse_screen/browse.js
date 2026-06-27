
const API_URL = 'http://localhost:3000';



const enter_URL = `${API_URL}/enter_chatroom`;
async function enter_room(room){
    console.log(`entered room ${room.name}`);

}


const refresh_URL = API_URL + "/refresh_chatrooms";
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

const add_chatrooms_URL = API_URL + "/retrieve_chatrooms"
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

            right.innerHTML =
                `${room.current_members}/${room.max_members}`;

            button.appendChild(left);
            button.appendChild(right);

            //--------------------------------------------------

            if (room.creator === currentUser) {

                if (!myHeadingAdded) {
                    buttonArea.appendChild(myHeading);
                    myHeadingAdded = true;
                }

                button.classList.add("self_created");

            }
            else {

                if (!publicHeadingAdded) {
                    buttonArea.appendChild(publicHeading);
                    publicHeadingAdded = true;
                }

                button.classList.add("public_room");

            }

            button.addEventListener("click", () => enter_room(room));

            buttonArea.appendChild(button);

        }

    }
    catch (err) {

        console.log(err);
        alert("Server Error");

    }

}
addChatrooms()


async function go_back() {
    window.location.href ="../chat_screen/chat.html";
}