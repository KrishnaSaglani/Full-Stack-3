const express = require('express');
const sql = require('mssql/msnodesqlv8');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const config = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS01;Database=KSChat;Trusted_Connection=yes;',
};

// PRE-CONNECT: Create a connection pool globally

//this is basically a function
// 1. Create a variable to hold our connection
let pool;

// 2. Create a function that handles the connection
async function connectToDatabase() {
    try {
        // Try to connect and store it in our 'pool' variable
        pool = await sql.connect(config);
        console.log(' Connected to MSSQL Database');
    } catch (err) {
        // If it fails, tell us exactly why
        console.error(' Database Connection Failed!', err.message);
    }
}

// 3. Call the function immediately
connectToDatabase();



app.post('/login', async function (req, res) {
    try {
        const { user, pwd } = req.body;        
        const result = await pool.request()
            .input('user', sql.NVarChar, user)
            .input('pwd', sql.NVarChar, pwd)
            .query("SELECT * FROM users WHERE UserName = @user AND UserPass = @pwd");

        // Anyone can bypass your frontend and call your API directly. So double check!
        if (result.recordset.length > 0) {
            res.json({ okay: true });
        } else {
            res.status(401).json({ okay: false, message: "Invalid username or password" });
        }
    } catch (err) {
        res.status(500).json({ okay: false, message: "Server Error" });
    }
});

app.post('/register', async function (req, res) {
    try {
        const { user, pwd } = req.body;
        const result = await pool.request()
            .input('user', sql.NVarChar, user)
            .input('pwd', sql.NVarChar, pwd)
            .query("INSERT INTO users (UserName, UserPass) VALUES (@user, @pwd)");

        if (result.rowsAffected[0] > 0) {
            res.json({ okay: true, message: "User registered successfully!" });
        }
    } catch (err) {
        // Handle Duplicate Username (SQL Error 2627 or 2601)
        if (err.number === 2627 || err.number === 2601) {
            res.status(400).json({ okay: false, message: "Username already exists!" });
        } else {
            console.error(err);
            res.status(500).json({ okay: false, message: "Registration failed" });
        }
    }
});

app.post('/create_room', async function(req, res){

    try{
        const { creator, name, description, max_members, rule, activeFor } = req.body;
        

        if (!name || !description || !creator) {
                return res.status(400).json({
                    okay: false,
                    failure_message: "Missing required fields."
                });
            }


    const result = await pool.request()
        .input("creator", sql.NVarChar, creator)
        .input("name", sql.NVarChar, name)
        .input("description", sql.NVarChar, description)
        .input("max_members", sql.Int, max_members)
        .input("rule", sql.NVarChar, rule)
        .input("active_for", sql.Int, activeFor)
        .query(`
            INSERT INTO Chatrooms
            (
                creator,
                name,
                description,
                max_members,
                chatroom_rule,
                active_for
            )
            OUTPUT INSERTED.chatroom_id
            VALUES
            (
                @creator,
                @name,
                @description,
                @max_members,
                @rule,
                @active_for
            );
        `);

        // Using OUTPUT INSERTED.chatroom_id is the standard 
        // SQL Server way to retrieve the ID of the row that was just inserted.


        const chat_id = result.recordset[0].chatroom_id;
        res.json(
            {
                okay:true,
                chat_id:chat_id
            }
        )
    }
    catch(err)
    {
        console.error(err);
        // need to do this also!!
        res.status(500).json(
            {
                okay:false,
                failure_message:"Server Error backend"
            }
        )
    }

} );

app.get('/refresh_chatrooms', async function(req, res){
    try{
        const expired_rooms = await pool.request()
                        .query(`select * from Chatrooms
                            where dateadd(DAY, active_for, date_created) 
                            < cast(getdate() as date)`);

        for( const room of expired_rooms.recordset)
        {
            console.log(`Deleting expired room ${room.name}`);
        }

        const result = await pool.request()
                        .query(`
                            delete from Chatrooms
                            where dateadd(DAY, active_for, date_created) < cast(getdate() as DATE) `)

        console.log(`${result.rowsAffected[0]} expired chatrooms removed`);
        res.json({
            success: true,
            deleted: result.rowsAffected[0]
        })
    }
    catch(err)
    {
        console.log(err);
        res.json({
            success: false,
            message: "Failed to refresh chatrooms."
        })
    }
});


app.get('/retrieve_chatrooms', async function (req, res){

    const result = await pool.request()
                    .query(`select * from Chatrooms`);

    res.json(result.recordset);

});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server live at http://localhost:${PORT}`);
});