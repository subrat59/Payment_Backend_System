const express = require("express");
const router = express.Router();

const supabase = require("../services/supabase.service");

router.post("/create", async (req, res) => {

  try {

    const { email, phone } = req.body;
    const full_name = req.body.fullName;

    console.log("Ine user route",full_name,
          email,
          phone)
    if (!full_name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone required",
      });
    }

    // Create user
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          full_name,
          email,
          phone,
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
      user: data[0],
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });

  }

});

router.post("/check-user", async (req, res) => {

  try {

    console.log(req.body)

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number required",
      });
    }

    // Check existing user
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();

    // User not found
    if (!data) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "User not found. Please signup.",
      });
    }

    // User exists
    return res.status(200).json({
      success: true,
      exists: true,
      message: "User exists",
      user: data,
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