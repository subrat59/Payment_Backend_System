const express = require("express");
const router = express.Router();

const supabase = require("../services/supabase.service");

router.post("/create", async (req, res) => {

  try {

    const user_id  = req.body.userId;

    console.log("in wallet route",req.body)

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID required",
      });
    }

    const { data, error } = await supabase
      .from("wallets")
      .insert([
        {
          user_id,
          balance: 0,
        },
      ])
      .select();

    if (error) {
      return res.status(500).json({
        success: false,
        error,
      });
    }

    return res.status(201).json({
      success: true,
      wallet: data[0],
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });

  }

});

router.get('/fetchbalance/:userId' , async (req,res) => {
    try{
        console.log("fetch balance")
        const user_id = req.params.userId;
        console.log(req.params)
        if(!user_id){
            return res.status(400).json({
        success: false,
        message: "Invalid user Id",
      });
        }
        const { data , error } = await supabase
        .from("wallets")
        .select()
        .eq("user_id",user_id)

        console.log("Balance",data[0].balance)
        
        if(error){
            return res.status(500).json({
            success: false,
            error,
            });   
        }

        return res.status(201).json({
        success: true,
        balance: data[0].balance,
        });
    } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });

  }
    
});

module.exports = router;