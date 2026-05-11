const express = require("express");

const crypto = require("crypto");

const router = express.Router();

const razorpay =
  require("../services/razorpay.service");

const supabase =
  require("../services/supabase.service");

const auth =
  require("../middleware/auth");



/*
========================================
CREATE ORDER
========================================
*/

router.post(
  "/create-order",
  auth,
  async (req, res) => {

    try {

      // Current logged in user
      const senderId =
        req.user.userId;

      // Get wallet
      const {
        data: senderWallet,
        error: walletError,
      } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", senderId)
        .single();

      if (walletError || !senderWallet) {

        return res.status(404).json({
          success: false,
          message: "Wallet not found",
        });
      }

      const {
        amount,
        currency,
      } = req.body;

      // Validation
      if (!amount) {

        return res.status(400).json({
          success: false,
          message:
            "Amount is required",
        });
      }

      // Razorpay order options
      const options = {

        amount: amount * 100,

        currency:
          currency || "INR",

        receipt:
          `receipt_${Date.now()}`,
      };

      // Create Razorpay order
      const order =
        await razorpay.orders.create(
          options
        );

      console.log(
        "Order Created:",
        order.id
      );

      // Store transaction
      const {
        data,
        error,
      } = await supabase
        .from("transactions")
        .insert([
          {
            sender_wallet_id:
              senderWallet.id,

            receiver_wallet_id:
              senderWallet.id,

            type:
              "ADD_MONEY",

            amount,

            status:
              "PENDING",

            razorpay_order_id:
              order.id,

            reference_id:
              crypto.randomUUID(),

            description:
              "Wallet Topup",
          },
        ])
        .select();

      if (error) {

        console.log(error);

        return res.status(500).json({
          success: false,
          message:
            "Transaction insert failed",
        });
      }

      return res.status(201).json({
        success: true,
        order,
      });

    } catch (error) {

      console.log(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to create order",
      });
    }
  }
);



/*
========================================
VERIFY PAYMENT
========================================
*/

router.post(
  "/verify-payment",
  auth,
  async (req, res) => {

    try {

      const senderId =
        req.user.userId;

      const {
        razorpay_order_id,

        razorpay_payment_id,

        razorpay_signature,
      } = req.body;

      // Generate signature
      const body =
        razorpay_order_id +
        "|" +
        razorpay_payment_id;

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env
              .RAZORPAY_KEY_SECRET
          )
          .update(body.toString())
          .digest("hex");

      // Verify signature
      const isAuthentic =
        expectedSignature ===
        razorpay_signature;

      if (!isAuthentic) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid signature",
        });
      }

      // Fetch transaction
      const {
        data: transactionData,
        error: transactionError,
      } = await supabase
        .from("transactions")
        .select("*")
        .eq(
          "razorpay_order_id",
          razorpay_order_id
        )
        .single();

      if (
        transactionError ||
        !transactionData
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Transaction not found",
        });
      }

      // Get wallet
      const {
        data: senderWallet,
        error: walletError,
      } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", senderId)
        .single();

      if (
        walletError ||
        !senderWallet
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Wallet not found",
        });
      }

      // Update transaction
      const {
        error: updateError,
      } = await supabase
        .from("transactions")
        .update({

          status: "SUCCESS",

          razorpay_payment_id,
        })
        .eq(
          "id",
          transactionData.id
        );

      if (updateError) {

        return res.status(500).json({
          success: false,
          message:
            "Transaction update failed",
        });
      }

      // Credit wallet
      const {
        error: balanceError,
      } = await supabase
        .from("wallets")
        .update({

          balance:
            senderWallet.balance +
            transactionData.amount,
        })
        .eq(
          "id",
          senderWallet.id
        );

      if (balanceError) {

        return res.status(500).json({
          success: false,
          message:
            "Wallet update failed",
        });
      }

      // Create ledger entry
      const {
        error: ledgerError,
      } = await supabase
        .from("ledger_entries")
        .insert([
          {
            transaction_id:
              transactionData.id,

            wallet_id:
              senderWallet.id,

            entry_type:
              "CREDIT",

            amount:
              transactionData.amount,
          },
        ]);

      if (ledgerError) {

        return res.status(500).json({
          success: false,
          message:
            "Ledger entry failed",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Payment verified successfully",
      });

    } catch (error) {

      console.log(error);

      return res.status(500).json({
        success: false,
        message:
          "Verification failed",
      });
    }
  }
);

module.exports = router;