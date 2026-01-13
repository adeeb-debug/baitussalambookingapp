import { collection, addDoc, writeBatch, doc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

// 1. NOTIFY ADMIN (Triggered when user first books)
export const sendAdminNotification = async (db, data) => {
  try {
    await addDoc(collection(db, "mail"), {
      to: "adeebahmad2@gmail.com",
      message: {
        subject: `NEW BOOKING: ${data.eventName}`,
        replyTo: data.email,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #00695c; padding: 20px; text-align: center; color: white;">
              <h2>New Booking Request</h2>
            </div>
            <div style="padding: 20px; line-height: 1.6;">
              <p><strong>Organizer:</strong> ${data.fullName}</p>
              <p><strong>Event:</strong> ${data.eventName}</p>
              <p><strong>Locations:</strong> ${data.locations}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.timeRange}</p>
              <div style="text-align: center; margin-top: 20px;">
                <a href="https://booking-baitussalam.web.app/" style="background: #00695c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Booking</a>
              </div>
            </div>
          </div>`,
      },
    });
  } catch (error) {
    console.error("Admin Email Error:", error);
  }
};

// 2. NOTIFY USER (Triggered by Admin when decisions are finished)
export const sendUserConfirmation = async (db, group) => {
  // Generate the HTML list of statuses for the email
  const locationListHtml = group.bookings
    .map(
      (b) => `
    <li style="margin-bottom: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px; list-style: none;">
      <strong style="color: #333;">${b.location}:</strong> 
      <span style="color: ${b.status === "Approved" ? "#2e7d32" : "#d32f2f"}; font-weight: bold; text-transform: uppercase; font-size: 0.85rem;">
        ${b.status}
      </span>
      ${b.rejectionReason ? `<br/><small style="color: #666; font-style: italic;">Note: ${b.rejectionReason}</small>` : ""}
    </li>`
    )
    .join("");

  try {
    // A. Add to Mail Collection
    await addDoc(collection(db, "mail"), {
      to: group.requestedBy,
      message: {
        subject: `Update: Your Booking for ${group.eventName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1976d2; padding: 20px; text-align: center; color: white;">
              <h2 style="margin:0;">Booking Decision</h2>
            </div>
            <div style="padding: 20px; line-height: 1.6;">
              <p>Hello <strong>${group.requestedByName}</strong>,</p>
              <p>The admin has finished reviewing your request for <strong>${group.eventName}</strong>.</p>
              <div style="margin: 20px 0;">
                ${locationListHtml}
              </div>
              <p style="font-size: 0.8rem; color: #888; border-top: 1px solid #eee; pt: 10px;">
                This is an automated update. If you have questions, please contact the admin office.
              </p>
            </div>
          </div>`,
      },
    });

    // B. Mark as "Notified" in the database so we don't send it twice
    const batch = writeBatch(db);
    group.bookings.forEach((b) => {
      const ref = doc(db, "bookings", b.id);
      batch.update(ref, { userNotified: true, notifiedAt: new Date().toISOString() });
    });
    await batch.commit();

  } catch (error) {
    console.error("User Notification Error:", error);
    throw error;
  }
};

// 3. INITIAL SUBMISSION (The Batch Create)
export const submitBookingBatch = async (db, user, formData, locations) => {
  const batch = writeBatch(db);
  const groupId = uuidv4();

  for (const locationName of locations) {
    const customId = `${formData.date}_${formData.eventName.replace(/\s+/g, '')}_${locationName.replace(/\s+/g, '')}`;
    const newDocRef = doc(collection(db, "bookings",customId));
    batch.set(newDocRef, {
      ...formData,
      location: locationName,
      status: "Pending",
      userNotified: false, // Track if decision email has been sent
      requestedBy: user.email,
      requestedByName: formData.fullName,
      requestedAt: new Date().toISOString(),
      groupId: groupId,
    });
  }
  await batch.commit();
  return { groupId };
};