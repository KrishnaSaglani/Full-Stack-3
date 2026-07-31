
async function enter_chats(userName) {
    console.log("Entering chats as:", userName);
    
    // Save the name in localStorage so the next page can read it!
    localStorage.setItem('storedUser', userName);
    
    // Move to the next page
    window.location.href = '../buffer_screen/buffer.html';
}



const Register_URL = '/register';
async function register() {
    // 1. Grab the values from the HTML inputs
    const username = document.getElementById('Username').value;
    const password = document.getElementById('Password').value;
    const confirm = document.getElementById('Confirm').value;

    // 2. Validation: Don't send if a field is empty
    if (!username || !password  || !confirm ) {
        alert("Please fill in all fields!");
        return;
    }

    if(password != confirm)
    {
        alert("Passwords not matching, pls try again.");
        return;
    }

    try {
        const response = await fetch(Register_URL, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Tells the server "I am sending JSON"
            },
            body: JSON.stringify({ 
                user: username, 
                pwd: password
            }) // Turns the JS object into a string for the trip
        });

        const result = await response.json();
        // converting to json data

        console.log("Server response:", result);

        // Refresh the list and clear inputs
        document.getElementById('Username').value = '';
        document.getElementById('Password').value = '';
        
        const display = document.getElementById('result')

        if(result.okay === true)
        {
            display.innerHTML =`
                    <p style="color: green;">Registration Successful!</p>
                    <button class = "proceed_button" onclick = "enter_chats('${username}')"> Proceed </button>
            `;
        }
        else
        {
            display.innerHTML =`
                    <p style="color: red;">Registration Failed: ${result.message}</p>
            `;
        }

    } catch (err) {
        console.error("Error during Login:", err);
    }
}