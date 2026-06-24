const API_URL = 'http://localhost:3000/login';

async function check_credentials() {
    // 1. Grab the values from the HTML inputs
    const username = document.getElementById('Username').value;
    const password = document.getElementById('Password').value;

    // 2. Validation: Don't send if a field is empty
    if (!username || !password ) {
        alert("Please fill in all fields!");
        return;
    }

    try {
        const response = await fetch(API_URL, { 
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
                    <p style="color: green;">Login Successful!</p>
                    <button class = "proceed_button" onclick = "enter_chats('${username}')"> Proceed </button>
            `;
        }
        else
        {
            display.innerHTML =`
                    <p style="color: red;">Login Failed: ${result.message}</p>
            `;
        }

    } catch (err) {
        console.error("Error during Login:", err);
    }
}


const Register_URL = 'http://localhost:3000/register';
async function register() {
    // 1. Grab the values from the HTML inputs
    const username = document.getElementById('Username').value;
    const password = document.getElementById('Password').value;

    // 2. Validation: Don't send if a field is empty
    if (!username || !password ) {
        alert("Please fill in all fields!");
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

async function enter_chats(userName) {
    console.log("Entering chats as:", userName);
    
    // Save the name in localStorage so the next page can read it!
    localStorage.setItem('storedUser', userName);
    
    // Move to the next page
    window.location.href = 'buffer.html';
}


function logout() {
    localStorage.removeItem('storedUser'); // Wipe the memory
    window.location.href = 'login.html';   // Go back to start
}