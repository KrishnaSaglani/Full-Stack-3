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