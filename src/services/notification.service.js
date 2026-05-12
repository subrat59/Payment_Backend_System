const supabase =
  require("./supabase.service");

async function createNotification({

  userId,

  title,

  message,

  type,
}) {

  const {
    data,
    error,
  } = await supabase
    .from("notifications")
    .insert([
      {
        user_id: userId,

        title,

        message,

        type,
      },
    ])
    .select()
    .single();

  if (error) {

    console.log(
      "Notification Error:",
      error
    );

    return null;
  }

  return data;
}

module.exports = {
  createNotification,
};