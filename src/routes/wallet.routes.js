const express = require("express");
const router = express.Router();

const supabase = require("../services/supabase.service");

const auth = require("../middleware/auth");

const {
  createNotification,
} = require(
  "../services/notification.service"
);

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

router.get('/fetchbalance' , auth , async (req,res) => {
    try{
        console.log("fetch balance")
        const user_id =req.user.userId;
        console.log(user_id)
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
/*
========================================
TRANSFER MONEY
========================================
*/

router.post(
  "/transfer",
  auth,
  async (req, res) => {

    try {

      const {
        receiverId,
        receiverPhone,
        amount,
      } = req.body;

      const senderId =
        req.user.userId;

      /*
      ========================================
      VALIDATION
      ========================================
      */

      if (
        (!receiverId &&
          !receiverPhone) ||
        !amount
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Receiver and amount required",
        });
      }

      /*
      ========================================
      FETCH SENDER USER
      ========================================
      */

      const {
        data: senderUser,
        error: senderUserError,
      } = await supabase
        .from("users")
        .select("*")
        .eq("id", senderId)
        .single();

      if (
        senderUserError ||
        !senderUser
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Sender not found",
        });
      }

      /*
      ========================================
      FETCH SENDER WALLET
      ========================================
      */

      const {
        data: senderWallet,
        error: senderWalletError,
      } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", senderId)
        .single();

      if (
        senderWalletError ||
        !senderWallet
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Sender wallet not found",
        });
      }

      /*
      ========================================
      FIND RECEIVER
      ========================================
      */

      let receiverUser;

      // Phone flow
      if (receiverPhone) {

        const {
          data,
          error,
        } = await supabase
          .from("users")
          .select("*")
          .eq("phone", receiverPhone)
          .single();

        if (error || !data) {

          return res.status(404).json({
            success: false,
            message:
              "Receiver not found",
          });
        }

        receiverUser = data;
      }

      // QR flow
      else {

        const {
          data,
          error,
        } = await supabase
          .from("users")
          .select("*")
          .eq("id", receiverId)
          .single();

        if (error || !data) {

          return res.status(404).json({
            success: false,
            message:
              "Receiver not found",
          });
        }

        receiverUser = data;
      }

      /*
      ========================================
      PREVENT SELF TRANSFER
      ========================================
      */

      if (
        receiverUser.id === senderId
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Cannot send money to yourself",
        });
      }

      /*
      ========================================
      FETCH RECEIVER WALLET
      ========================================
      */

      const {
        data: receiverWallet,
        error: receiverWalletError,
      } = await supabase
        .from("wallets")
        .select("*")
        .eq(
          "user_id",
          receiverUser.id
        )
        .single();

      if (
        receiverWalletError ||
        !receiverWallet
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Receiver wallet not found",
        });
      }

      /*
      ========================================
      CHECK BALANCE
      ========================================
      */

      if (
        senderWallet.balance <
        amount
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Insufficient balance",
        });
      }

      /*
      ========================================
      DEDUCT SENDER BALANCE
      ========================================
      */

      const {
        error: deductError,
      } = await supabase
        .from("wallets")
        .update({
          balance:
            senderWallet.balance -
            amount,
        })
        .eq("id", senderWallet.id);

      if (deductError) {

        return res.status(500).json({
          success: false,
          message:
            "Failed to deduct balance",
        });
      }

      /*
      ========================================
      ADD RECEIVER BALANCE
      ========================================
      */

      const {
        error: addError,
      } = await supabase
        .from("wallets")
        .update({
          balance:
            receiverWallet.balance +
            amount,
        })
        .eq("id", receiverWallet.id);

      if (addError) {

        return res.status(500).json({
          success: false,
          message:
            "Failed to add balance",
        });
      }

      /*
      ========================================
      CREATE TRANSACTION
      ========================================
      */

      const {
        data: transactionData,
        error: transactionError,
      } = await supabase
        .from("transactions")
        .insert([
          {
            sender_wallet_id:
              senderWallet.id,

            receiver_wallet_id:
              receiverWallet.id,

            type: "TRANSFER",

            amount,

            status: "SUCCESS",

            reference_id:
              crypto.randomUUID(),

            description:
              "Wallet transfer",
          },
        ])
        .select()
        .single();

      if (transactionError) {

        return res.status(500).json({
          success: false,
          message:
            "Transaction creation failed",
        });
      }

      /*
      ========================================
      LEDGER ENTRIES
      ========================================
      */

      // Sender Ledger
      await supabase
        .from("ledger_entries")
        .insert([
          {
            transaction_id:
              transactionData.id,

            wallet_id:
              senderWallet.id,

            entry_type:
              "DEBIT",

            amount,
          },
        ]);

      // Receiver Ledger
      await supabase
        .from("ledger_entries")
        .insert([
          {
            transaction_id:
              transactionData.id,

            wallet_id:
              receiverWallet.id,

            entry_type:
              "CREDIT",

            amount,
          },
        ]);

      /*
      ========================================
      NOTIFICATIONS
      ========================================
      */

      await createNotification({

        userId: senderId,

        title: "Money Sent",

        message:
          `₹${amount} sent to ${receiverUser.full_name}`,

        type: "DEBIT",
      });

      await createNotification({

        userId:
          receiverUser.id,

        title:
          "Money Received",

        message:
          `₹${amount} received from ${senderUser.full_name}`,

        type: "CREDIT",
      });

      /*
      ========================================
      RESPONSE
      ========================================
      */

      return res.status(200).json({

        success: true,

        message:
          "Money transferred successfully",
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

router.get(
  "/history",
  auth,
  async (req, res) => {

    try {

      const userId =
        req.user.userId;

      // Current wallet
      const {
        data: currentWallet,
      } = await supabase
        .from("wallets")
        .select()
        .eq("user_id", userId)
        .single();

      // Transactions
      const {
        data: transactions,
        error,
      } = await supabase
        .from("transactions")
        .select(`
          *,
          sender_wallet:sender_wallet_id (
            id,
            user_id
          ),
          receiver_wallet:receiver_wallet_id (
            id,
            user_id
          )
        `)
        .or(
          `sender_wallet_id.eq.${currentWallet.id},receiver_wallet_id.eq.${currentWallet.id}`
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        return res.status(500).json({
          success: false,
          error,
        });
      }

      // Enrich transactions
      const enrichedTransactions =
        await Promise.all(

          transactions.map(
            async (txn) => {

              const isDebit =
                txn.receiver_wallet_id !=
                currentWallet.id;   

              const otherUserId =
                isDebit
                  ? txn.receiver_wallet.user_id
                  : txn.sender_wallet.user_id;

              // Fetch other user
              const {
                data: otherUser,
              } = await supabase
                .from("users")
                .select()
                .eq("id", otherUserId)
                .single();

              return {
                ...txn,

                transactionType:
                  isDebit
                    ? "DEBIT"
                    : "CREDIT",

                otherUser:
                  otherUser?.full_name,
              };
            }
          )
        );

      return res.status(200).json({
        success: true,

        transactions:
          enrichedTransactions,
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