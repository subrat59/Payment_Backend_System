const express = require("express");

const router = express.Router();

const auth =
  require("../middleware/auth");

const supabase =
  require("../services/supabase.service");


// Fetch notifications
router.get(
  "/",
  auth,
  async (req, res) => {

    try {
      console.log("Noti")

      const userId =
        req.user.userId;

      const {
        data,
        error,
      } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {

        return res.status(500).json({
          success: false,
          error,
        });
      }

      return res.status(200).json({
        success: true,
        notifications: data,
      });

    } catch (error) {

      console.log(error);

      return res.status(500).json({
        success: false,
        message:
          "Internal server error",
      });
    }
  }
);

module.exports = router;