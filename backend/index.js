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


        const chatroom_id = result.recordset[0].chatroom_id;
        return res.json(
            {
                okay:true,
                chatroom_id:chatroom_id
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

app.get('/refresh_chatrooms', async function(req, res) {
   try{
        const expired_rooms = await pool.request()
                        .query(`select * from Chatrooms
                            where dateadd(DAY, active_for, date_created) 
                            < cast(getdate() as date)`);

        for( const room of expired_rooms.recordset)
        {
            console.log(`Deleting expired room tables for ${room.name}`);
            const chatroom_id = room.chatroom_id;
                        const result = await pool.request().input("chatroom_id", sql.Int, chatroom_id)
                        .query(`DECLARE @RoomTable NVARCHAR(128);
                                DECLARE @MembersTable NVARCHAR(128);
                                DECLARE @SQL NVARCHAR(MAX);

                                SET @RoomTable = 'Room_' + CAST(@chatroom_id AS VARCHAR(20));
                                SET @MembersTable = @RoomTable + '_Members';

                                -- Check Members table
                                IF OBJECT_ID(@MembersTable, 'U') IS NULL
                                BEGIN
                                    THROW 50003, 'Chatroom members table does not exist.', 1;
                                END

                                -- Check Room table
                                IF OBJECT_ID(@RoomTable, 'U') IS NULL
                                BEGIN
                                    THROW 50004, 'Chatroom table does not exist.', 1;
                                END

                                SET @SQL = '
                                DROP TABLE ' + QUOTENAME(@MembersTable) + ';
                                DROP TABLE ' + QUOTENAME(@RoomTable) + ';
                                ';

                                EXEC sp_executesql @SQL;`);
            
            
            await pool.request()
            .input("id", sql.Int, room.chatroom_id)
            .query(`
                DELETE FROM Chatrooms
                WHERE chatroom_id=@id
            `);
            console.log(`Removed room ${room.name} from Chatrooms table`);


        }

        console.log(`Removed ${expired_rooms.recordset.length} Chatrooms due to expiry`);
        return res.json({
            okay:true
        })

        

        }
    catch(err)
    {
        console.error(err);
        res.json(
            {
                okay:false,
                message:err.message
            }
        )
    }
    
});


app.get('/retrieve_chatrooms', async function (req, res){

    const result = await pool.request()
                    .query(`select * from Chatrooms`);

    res.json(result.recordset);

});


app.post("/delete_chatroom", async function (req, res){
    const {chatroom_id} = req.body;
    // Name has to be the SAME as sent in script
    try{
        const result = await pool.request().input("chatroom_id", sql.Int, chatroom_id)
                    .query(`delete from Chatrooms where 
                        chatroom_id = @chatroom_id`);
        
        if(result.rowsAffected[0]===0)
        {
            return res.json({
                okay:false,
                message:"Unable to find room"
            })
        }
        else{
            console.log(`Chatroom ${chatroom_id} deleted successfully from Chatrooms table!`);
        }




        //Now remove the corresponding tables also!!

        console.log(`Removing Tables for chatroom: ${chatroom_id}`);

        await pool.request().input("chatroom_id", sql.Int, chatroom_id)
                        .query(`DECLARE @RoomTable NVARCHAR(128);
                                DECLARE @MembersTable NVARCHAR(128);
                                DECLARE @SQL NVARCHAR(MAX);

                                SET @RoomTable = 'Room_' + CAST(@chatroom_id AS VARCHAR(20));
                                SET @MembersTable = @RoomTable + '_Members';

                                -- Check Members table
                                IF OBJECT_ID(@MembersTable, 'U') IS NULL
                                BEGIN
                                    THROW 50003, 'Chatroom members table does not exist.', 1;
                                END

                                -- Check Room table
                                IF OBJECT_ID(@RoomTable, 'U') IS NULL
                                BEGIN
                                    THROW 50004, 'Chatroom table does not exist.', 1;
                                END

                                SET @SQL = '
                                DROP TABLE ' + QUOTENAME(@MembersTable) + ';
                                DROP TABLE ' + QUOTENAME(@RoomTable) + ';
                                ';

                                EXEC sp_executesql @SQL;`);

        console.log(`Removed room_id: ${chatroom_id} from Chatrooms table`);

        res.json({
                okay:true
            })
            
    }
    catch(err)
    {
        console.error(err);
        res.status(500).json({
            okay:false,
            message:"Server Error"
        })
    }
    
});


app.post("/create_tables",async function(req, res){
    const {chatroom_id} = req.body;

    try{
        const result=await pool.request().input("chatroom_id",sql.Int, chatroom_id)
        .query(`DECLARE @TableName NVARCHAR(128);
                    DECLARE @SQL NVARCHAR(MAX);

                    SET @TableName = 'Room_' + CAST(@chatroom_id AS VARCHAR(20));

                    IF OBJECT_ID(@TableName, 'U') IS NOT NULL
                    BEGIN
                        THROW 50001, 'Chatroom table already exists.', 1;
                    END

                    SET @SQL = '
                    CREATE TABLE ' + QUOTENAME(@TableName) + ' (

                        chat_id INT IDENTITY(1,1) PRIMARY KEY,

                        sender NVARCHAR(100) NOT NULL,

                        notif NVARCHAR(50),

                        sent_at DATETIME NOT NULL DEFAULT GETDATE(),

                        deleted BIT NOT NULL DEFAULT 0,

                        replying BIT NOT NULL DEFAULT 0,

                        message NVARCHAR(MAX) NOT NULL

                    );';

                    EXEC sp_executesql @SQL;`);

        // In case of insertion or deletion queries, no recordset is returned
        res.json({
            okay:true
        })

    }
    catch(err)
    {
        console.error(err);
        res.json(
            {
                okay:false,
                message:`Unable to create room table for room_id: ${chatroom_id}`
            }
        )

    }


    // Now creating the members table similarly:
    try{
        const result = await pool.request().input("chatroom_id", sql.Int, chatroom_id)
        .query(`DECLARE @TableName NVARCHAR(128);
            DECLARE @SQL NVARCHAR(MAX);

            SET @TableName = 'Room_' + CAST(@chatroom_id AS VARCHAR(20)) + '_Members';

            IF OBJECT_ID(@TableName, 'U') IS NOT NULL
            BEGIN
                THROW 50002, 'Chatroom members table already exists.', 1;
            END

            SET @SQL = '
            CREATE TABLE ' + QUOTENAME(@TableName) + ' (

                member_id INT IDENTITY(1,1) PRIMARY KEY,

                member_name NVARCHAR(100) NOT NULL UNIQUE

            );';

            EXEC sp_executesql @SQL;`);


            res.json({
                okay:true
            })
    }catch(err)
    {
        console.log(err);
        res.json(
            {
                okay:false,
                message:`Unable to create room table for room_id: ${chatroom_id}`
            }
        )
    }





});



app.post("/load_chats", async function(req, res){
    const{chatroom_id, last_chat_id} = req.body;
    try{
        const room_name = `Room_${chatroom_id}`;
        const result = await pool.request()
        .input("room_name", sql.NVarChar, room_name)
        .input("last_chat_id", sql.Int, last_chat_id)
        .query(`

            DECLARE @SQL NVARCHAR(MAX);

            SET @SQL = '
            SELECT *
            FROM ' + QUOTENAME(@room_name) + '
            WHERE chat_id > @last_chat_id
            ORDER BY chat_id;
            ';

            EXEC sp_executesql
                @SQL,
                N'@last_chat_id INT',
                @last_chat_id = @last_chat_id;
            
            `);


        res.json({
            okay:true,
            new_chats:result.recordset
        })
        
    }
    catch(err)
    {
        console.error(err);
        res.json({
            okay:false,
            message:err.message
        })
    }
});

async function rollbackMemberCount(chatroom_id){

    await pool.request()
        .input("chatroom_id", sql.Int, chatroom_id)
        .query(`
            UPDATE Chatrooms
            SET current_members=current_members-1
            WHERE chatroom_id=@chatroom_id
        `);

}
app.post("/add_member", async function(req, res){
    const{user, chatroom_id} = req.body;
    const chatroom_name = `Room_${chatroom_id}_Members`;
    try{
        // first check in Chatrooms if for this id, is current_members<max_members?
        const result1 = await pool.request().input("chatroom_id", sql.Int, chatroom_id)
        .query(`update Chatrooms
            set current_members = current_members+1
            where chatroom_id = @chatroom_id
            and current_members < max_members`);
        

        if(result1.rowsAffected[0]===0)
        {
            return res.json({
                okay:false,
                message:"Chatroom already full."
            })
        }
        else
        {
            
            // current_members<max_members
            console.log(`Chatroom ${chatroom_id} has enough space for you to enter`);

            // Now add the members in
            try{
                const result2 = await pool.request().input("chatroom_name", sql.NVarChar, chatroom_name)
                .input("user", sql.NVarChar, user)
                .query(`DECLARE @SQL NVARCHAR(MAX);

                SET @SQL = '
                INSERT INTO ' + QUOTENAME(@chatroom_name) + '
                (member_name)

                VALUES (@user);
                ';

                EXEC sp_executesql
                    @SQL,
                    N'@user NVARCHAR(100)',
                    @user = @user;`);
                // query should add this user into the table with name @chatroom_name
                // basically an insert query
                res.json({
                    okay:true
                })
            }
            catch(err)
            {
                console.log("Unable to add you into actual chatroom list")
                
                if(err.number === 2627 || err.number === 2601)
                    {
                        // doing rollback, removing one extra added member
                        await rollbackMemberCount(chatroom_id);
                        return res.json({
                            okay:false,
                            message:"You are already a member of this chatroom."
                        });
                    }

                else
                {
                    // doing rollback, removing one extra added member
                        await rollbackMemberCount(chatroom_id);
                    
                    return res.json(
                    {
                        okay:false,
                        message:`Unable to enter data into tables for ${user}`
                    }
                )

                }
            }
            
        }
    }
    catch(err)
    {
        console.error(err);

        return res.json({
            okay:false,
            message:"Server Error pls try again."
        })
    }
});


app.post("/remove_member", async function(req, res){
    const{user, chatroom_id} = req.body;
    const chatroom_name = `Room_${chatroom_id}_Members`;
    try{

        // Remove from chatroom first
        const result2 = await pool.request().input("chatroom_name", sql.NVarChar, chatroom_name)
                .input("user", sql.NVarChar, user)
                .query(`DECLARE @SQL NVARCHAR(MAX);

                    SET @SQL = '
                    DELETE FROM ' + QUOTENAME(@chatroom_name) + '
                    WHERE member_name = @user;

                    IF @@ROWCOUNT = 0
                    BEGIN
                        THROW 50011, ''User is not a member of this chatroom.'', 1;
                    END
                    ';

                    EXEC sp_executesql
                        @SQL,
                        N'@user NVARCHAR(100)',
                        @user = @user;`);



            console.log(`Successfully removed from Room_${chatroom_id}`);

        // reducing current_members count!
        await pool.request().input("chatroom_id", sql.Int, chatroom_id)
        .query(`update Chatrooms
            set current_members = current_members-1
            where chatroom_id = @chatroom_id
            AND current_members>0;`);


            res.json({
                okay:true
            })


    }
    catch(err)
    {
        console.error(err);
         if(err.number === 50011)
            {
                return res.json({
                    okay:false,
                    message:"You are not a member of this chatroom."
                });
            }

            res.json({
                okay:false,
                message:"Server Error"
            })
    }
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server live at http://localhost:${PORT}`);
});