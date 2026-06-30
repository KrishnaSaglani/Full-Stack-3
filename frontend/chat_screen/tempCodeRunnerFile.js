
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
